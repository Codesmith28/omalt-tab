// Navigation.js: MRU cycling, home-row jumping, and 2D spatial navigation for omalt-tab

.pragma library

var DEFAULT_HOME_ROW_LETTERS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"];

/**
 * Cycle index with wrap-around.
 */
function cycleIndex(currentIndex, delta, totalCount) {
    if (totalCount <= 0) return 0;
    return (currentIndex + delta + totalCount) % totalCount;
}

function centerCx(win) {
    return (win.normX || 0) + (win.normW || 0) / 2;
}

function centerCy(win) {
    return (win.normY || 0) + (win.normH || 0) / 2;
}

/**
 * Finds target for 2D spatial navigation (up, down, left, right).
 * Supports moving between windows and empty workspaces.
 * Returns: { address: string|null, wsId: number, isWorkspace: boolean }
 */
function findSpatialTarget(workspacesData, currentAddress, currentWsId, direction) {
    if (!workspacesData || workspacesData.length === 0) return null;

    var curWsIdx = -1;
    var curWin = null;

    // 1. Locate current window / workspace
    if (currentAddress) {
        for (var w = 0; w < workspacesData.length; w++) {
            var ws = workspacesData[w];
            for (var k = 0; k < ws.windows.length; k++) {
                if (ws.windows[k].address === currentAddress) {
                    curWsIdx = w;
                    curWin = ws.windows[k];
                    break;
                }
            }
            if (curWin) break;
        }
    }

    if (curWsIdx === -1 && currentWsId > 0) {
        for (var w = 0; w < workspacesData.length; w++) {
            if (workspacesData[w].id === currentWsId) {
                curWsIdx = w;
                break;
            }
        }
    }

    // If neither is found, fallback to first workspace
    if (curWsIdx === -1) {
        var firstWs = workspacesData[0];
        if (firstWs.windows && firstWs.windows.length > 0) {
            return { address: firstWs.windows[0].address, wsId: firstWs.id, isWorkspace: false };
        }
        return { address: null, wsId: firstWs.id, isWorkspace: true };
    }

    var currentWs = workspacesData[curWsIdx];

    // If current selection is an empty workspace (no curWin)
    if (!curWin) {
        if (direction === "right" || direction === "down") {
            var nextWsIdx = (curWsIdx + 1) % workspacesData.length;
            var nextWs = workspacesData[nextWsIdx];
            if (nextWs.windows && nextWs.windows.length > 0) {
                return { address: nextWs.windows[0].address, wsId: nextWs.id, isWorkspace: false };
            }
            return { address: null, wsId: nextWs.id, isWorkspace: true };
        } else if (direction === "left" || direction === "up") {
            var prevWsIdx = (curWsIdx - 1 + workspacesData.length) % workspacesData.length;
            var prevWs = workspacesData[prevWsIdx];
            if (prevWs.windows && prevWs.windows.length > 0) {
                return { address: prevWs.windows[prevWs.windows.length - 1].address, wsId: prevWs.id, isWorkspace: false };
            }
            return { address: null, wsId: prevWs.id, isWorkspace: true };
        }
        return null;
    }

    var curCx = centerCx(curWin);
    var curCy = centerCy(curWin);

    if (direction === "down") {
        var bestDown = null;
        var bestDownScore = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            if (cand.address === curWin.address) continue;
            var dy = centerCy(cand) - curCy;
            if (dy > 0.05) {
                var score = dy * 2 + Math.abs(centerCx(cand) - curCx);
                if (score < bestDownScore) {
                    bestDownScore = score;
                    bestDown = cand;
                }
            }
        }
        if (bestDown) return { address: bestDown.address, wsId: currentWs.id, isWorkspace: false };

        // Wrap to topmost window in current workspace
        var topWin = null;
        var minCy = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            var candCy = centerCy(cand);
            if (candCy < minCy) {
                minCy = candCy;
                topWin = cand;
            }
        }
        if (topWin && topWin.address !== curWin.address) {
            return { address: topWin.address, wsId: currentWs.id, isWorkspace: false };
        }
    } else if (direction === "up") {
        var bestUp = null;
        var bestUpScore = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            if (cand.address === curWin.address) continue;
            var dy = curCy - centerCy(cand);
            if (dy > 0.05) {
                var score = dy * 2 + Math.abs(centerCx(cand) - curCx);
                if (score < bestUpScore) {
                    bestUpScore = score;
                    bestUp = cand;
                }
            }
        }
        if (bestUp) return { address: bestUp.address, wsId: currentWs.id, isWorkspace: false };

        // Wrap to bottom-most window in current workspace
        var bottomWin = null;
        var maxCy = -Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            var candCy = centerCy(cand);
            if (candCy > maxCy) {
                maxCy = candCy;
                bottomWin = cand;
            }
        }
        if (bottomWin && bottomWin.address !== curWin.address) {
            return { address: bottomWin.address, wsId: currentWs.id, isWorkspace: false };
        }
    } else if (direction === "right") {
        // 1. Look for windows to the right inside current workspace
        var bestRight = null;
        var bestRightScore = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            if (cand.address === curWin.address) continue;
            var dx = centerCx(cand) - curCx;
            if (dx > 0.05) {
                var score = dx + Math.abs(centerCy(cand) - curCy) * 0.8;
                if (score < bestRightScore) {
                    bestRightScore = score;
                    bestRight = cand;
                }
            }
        }
        if (bestRight) return { address: bestRight.address, wsId: currentWs.id, isWorkspace: false };

        // 2. Move to next workspace on the right
        var nextWsIdx = (curWsIdx + 1) % workspacesData.length;
        var nextWs = workspacesData[nextWsIdx];
        if (nextWs.windows && nextWs.windows.length > 0) {
            var bestNextWin = null;
            var minScore = Infinity;
            for (var k = 0; k < nextWs.windows.length; k++) {
                var cand = nextWs.windows[k];
                var score = (cand.normX || 0) * 2 + Math.abs(centerCy(cand) - curCy);
                if (score < minScore) {
                    minScore = score;
                    bestNextWin = cand;
                }
            }
            if (bestNextWin) return { address: bestNextWin.address, wsId: nextWs.id, isWorkspace: false };
        }
        // Next workspace is empty
        return { address: null, wsId: nextWs.id, isWorkspace: true };
    } else if (direction === "left") {
        // 1. Look for windows to the left inside current workspace
        var bestLeft = null;
        var bestLeftScore = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            if (cand.address === curWin.address) continue;
            var dx = curCx - centerCx(cand);
            if (dx > 0.05) {
                var score = dx + Math.abs(centerCy(cand) - curCy) * 0.8;
                if (score < bestLeftScore) {
                    bestLeftScore = score;
                    bestLeft = cand;
                }
            }
        }
        if (bestLeft) return { address: bestLeft.address, wsId: currentWs.id, isWorkspace: false };

        // 2. Move to previous workspace on the left
        var prevWsIdx = (curWsIdx - 1 + workspacesData.length) % workspacesData.length;
        var prevWs = workspacesData[prevWsIdx];
        if (prevWs.windows && prevWs.windows.length > 0) {
            var bestPrevWin = null;
            var minScore = Infinity;
            for (var k = 0; k < prevWs.windows.length; k++) {
                var cand = prevWs.windows[k];
                var candRight = (cand.normX || 0) + (cand.normW || 0);
                var score = (1.0 - candRight) * 2 + Math.abs(centerCy(cand) - curCy);
                if (score < minScore) {
                    minScore = score;
                    bestPrevWin = cand;
                }
            }
            if (bestPrevWin) return { address: bestPrevWin.address, wsId: prevWs.id, isWorkspace: false };
        }
        // Previous workspace is empty
        return { address: null, wsId: prevWs.id, isWorkspace: true };
    }

    return null;
}

/**
 * Resolves workspace jump by letter.
 * If workspace is visible, selects first window.
 * If workspace is empty or off-screen, switches directly to workspace ID.
 */
function findWorkspaceJump(workspacesData, letter) {
    if (!letter) return null;
    var lower = letter.toLowerCase();

    // 1. Check displayed workspaces
    if (workspacesData && workspacesData.length > 0) {
        for (var i = 0; i < workspacesData.length; i++) {
            var ws = workspacesData[i];
            if (ws.letterLower === lower) {
                if (ws.windows && ws.windows.length > 0) {
                    return { address: ws.windows[0].address, empty: false, wsId: ws.id, wsIdx: i };
                } else {
                    return { address: null, empty: true, wsId: ws.id, wsIdx: i };
                }
            }
        }
    }

    // 2. Fallback: map home-row letter directly to workspace ID (1..10)
    var letters = DEFAULT_HOME_ROW_LETTERS;
    var idx = letters.indexOf(lower);
    if (idx !== -1) {
        return { address: null, empty: true, wsId: idx + 1, wsIdx: -1 };
    }

    return null;
}

/**
 * Resolves window jump by 1-based number within current workspace.
 */
function findWindowJump(workspacesData, currentWsId, number) {
    if (!workspacesData || !currentWsId) return null;
    for (var i = 0; i < workspacesData.length; i++) {
        var ws = workspacesData[i];
        if (ws.id === currentWsId) {
            for (var j = 0; j < ws.windows.length; j++) {
                if (ws.windows[j].wsIndex === number) {
                    return ws.windows[j].address;
                }
            }
        }
    }
    return null;
}
