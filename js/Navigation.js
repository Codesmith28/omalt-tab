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

/**
 * Finds target address for 2D spatial navigation (up, down, left, right).
 */
function findSpatialTarget(workspacesData, currentAddress, direction) {
    if (!workspacesData || workspacesData.length === 0) return null;

    var curWsIdx = -1;
    var curWin = null;

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

    // If no active window is found, fallback to first available
    if (!curWin) {
        for (var i = 0; i < workspacesData.length; i++) {
            if (workspacesData[i].windows.length > 0) {
                return workspacesData[i].windows[0].address;
            }
        }
        return null;
    }

    var currentWs = workspacesData[curWsIdx];
    var curCx = curWin.rx + curWin.rw / 2;
    var curCy = curWin.ry + curWin.rh / 2;

    if (direction === "down") {
        var bestDown = null;
        var bestDownScore = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            if (cand.address === curWin.address) continue;
            var candCy = cand.ry + cand.rh / 2;
            var candCx = cand.rx + cand.rw / 2;
            var dy = candCy - curCy;
            if (dy > 15) {
                var score = dy * 2 + Math.abs(candCx - curCx);
                if (score < bestDownScore) {
                    bestDownScore = score;
                    bestDown = cand;
                }
            }
        }
        if (bestDown) return bestDown.address;

        // Wrap to topmost window in current workspace
        var topWin = null;
        var minCy = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            var candCy = cand.ry + cand.rh / 2;
            if (candCy < minCy) {
                minCy = candCy;
                topWin = cand;
            }
        }
        if (topWin && topWin.address !== curWin.address) {
            return topWin.address;
        }
    } else if (direction === "up") {
        var bestUp = null;
        var bestUpScore = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            if (cand.address === curWin.address) continue;
            var candCy = cand.ry + cand.rh / 2;
            var candCx = cand.rx + cand.rw / 2;
            var dy = curCy - candCy;
            if (dy > 15) {
                var score = dy * 2 + Math.abs(candCx - curCx);
                if (score < bestUpScore) {
                    bestUpScore = score;
                    bestUp = cand;
                }
            }
        }
        if (bestUp) return bestUp.address;

        // Wrap to bottom-most window in current workspace
        var bottomWin = null;
        var maxCy = -Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            var candCy = cand.ry + cand.rh / 2;
            if (candCy > maxCy) {
                maxCy = candCy;
                bottomWin = cand;
            }
        }
        if (bottomWin && bottomWin.address !== curWin.address) {
            return bottomWin.address;
        }
    } else if (direction === "right") {
        // 1. Look for windows to the right inside current workspace
        var bestRight = null;
        var bestRightScore = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            if (cand.address === curWin.address) continue;
            var candCx = cand.rx + cand.rw / 2;
            var candCy = cand.ry + cand.rh / 2;
            var dx = candCx - curCx;
            if (dx > 20) {
                var score = dx + Math.abs(candCy - curCy) * 0.8;
                if (score < bestRightScore) {
                    bestRightScore = score;
                    bestRight = cand;
                }
            }
        }
        if (bestRight) return bestRight.address;

        // 2. Move to next workspace on the right
        for (var step = 1; step < workspacesData.length; step++) {
            var nextWsIdx = (curWsIdx + step) % workspacesData.length;
            var nextWs = workspacesData[nextWsIdx];
            if (nextWs.windows && nextWs.windows.length > 0) {
                var bestNextWin = null;
                var minScore = Infinity;
                for (var k = 0; k < nextWs.windows.length; k++) {
                    var cand = nextWs.windows[k];
                    var score = cand.rx * 2 + Math.abs((cand.ry + cand.rh / 2) - curCy);
                    if (score < minScore) {
                        minScore = score;
                        bestNextWin = cand;
                    }
                }
                if (bestNextWin) return bestNextWin.address;
            }
        }
    } else if (direction === "left") {
        // 1. Look for windows to the left inside current workspace
        var bestLeft = null;
        var bestLeftScore = Infinity;
        for (var i = 0; i < currentWs.windows.length; i++) {
            var cand = currentWs.windows[i];
            if (cand.address === curWin.address) continue;
            var candCx = cand.rx + cand.rw / 2;
            var candCy = cand.ry + cand.rh / 2;
            var dx = curCx - candCx;
            if (dx > 20) {
                var score = dx + Math.abs(candCy - curCy) * 0.8;
                if (score < bestLeftScore) {
                    bestLeftScore = score;
                    bestLeft = cand;
                }
            }
        }
        if (bestLeft) return bestLeft.address;

        // 2. Move to previous workspace on the left
        for (var step = 1; step < workspacesData.length; step++) {
            var prevWsIdx = (curWsIdx - step + workspacesData.length) % workspacesData.length;
            var prevWs = workspacesData[prevWsIdx];
            if (prevWs.windows && prevWs.windows.length > 0) {
                var bestPrevWin = null;
                var minScore = Infinity;
                for (var k = 0; k < prevWs.windows.length; k++) {
                    var cand = prevWs.windows[k];
                    var score = (280 - (cand.rx + cand.rw)) * 2 + Math.abs((cand.ry + cand.rh / 2) - curCy);
                    if (score < minScore) {
                        minScore = score;
                        bestPrevWin = cand;
                    }
                }
                if (bestPrevWin) return bestPrevWin.address;
            }
        }
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
                    return { address: ws.windows[0].address, empty: false, wsId: ws.id };
                } else {
                    return { address: null, empty: true, wsId: ws.id };
                }
            }
        }
    }

    // 2. Fallback: map home-row letter directly to workspace ID (1..10)
    var letters = DEFAULT_HOME_ROW_LETTERS;
    var idx = letters.indexOf(lower);
    if (idx !== -1) {
        return { address: null, empty: true, wsId: idx + 1 };
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
