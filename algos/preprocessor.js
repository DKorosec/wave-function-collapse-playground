// 1. Lets seek all possible inputs.
function analyzeInput(imgIn, WIN_SIZE) {
    const { W, H, mat } = imgIn;
    const history = new Map();
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const m = new ObservingWindow(WIN_SIZE);
            m.consume(mat, x, y);
            const uHash = m.windowHashes();
            const historyWindowHash = uHash.find(hash => history.get(hash));
            if (historyWindowHash) {
                const historyWindow = history.get(historyWindowHash);
                ++historyWindow.repeat;
            } else {
                const firstHash = uHash[0];
                history.set(firstHash, m);
            }
        }
    }
    return Array.from(history.values());
}

// 2. Create fast lookup tables of tile A -> tile B possibilities
function constructConcatenationLookups(observingWindows) {
    // Introduce random, so algorithm can be iterative at picking a choice and still look random (on start)!
    windows = observingWindows.flatMap(observingWindow => observingWindow.getWindows()).map(v => ({ v, rng: Math.random() })).sort((a, b) => a.rng - b.rng).map(v => v.v);
    // introduce extra statistics for further algorithms to digests.
    const size = windows[0].length;
    const maxWeight = windows.reduce((max, window) => Math.max(window.weight, max), 0);
    for (const window of windows) {
        window.weightRatio = window.weight / maxWeight;
    }

    function buildDirectionWindowAllCombos(sourceWindow, toDir) {
        const wSize = sourceWindow.length;
        let combos = [sourceWindow];
        for (let it = 0; combos.length && it < wSize; it++) {
            const nextCombos = [];
            for (const last of combos) {
                const nextOpts = Array.from(toDir.get(last) ?? []);
                nextCombos.push(...nextOpts);
            }
            combos = nextCombos;
        }
        return {
            set: new Set(combos),
            array: combos
        }
    }

    function isToRight(A, B) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size - 1; x++) {
                if (A[y][1 + x] !== B[y][x]) {
                    return false;
                }
            }
        }
        return true;
    }
    function isToDown(A, B) {
        for (let y = 0; y < size - 1; y++) {
            for (let x = 0; x < size; x++) {
                if (A[1 + y][x] !== B[y][x]) {
                    return false;
                }
            }
        }
        return true;
    }
    function setLookupDir(lookup, A, B) {
        const r = lookup.get(A) ?? new Set();
        r.add(B);
        lookup.set(A, r);
    }


    const toRight = new Map();
    const toLeft = new Map();
    const toDown = new Map();
    const toUp = new Map();

    console.log('1. PASS | processing window:', windows.length);
    for (let i = 0; i < windows.length; i++) {
        const A = windows[i];
        for (let j = 0; j < windows.length; j++) {
            const B = windows[j];
            const rightFlag = isToRight(A, B);
            const downFlag = isToDown(A, B);
            if (rightFlag) {
                setLookupDir(toRight, A, B);
                setLookupDir(toLeft, B, A);
            }
            if (downFlag) {
                setLookupDir(toDown, A, B);
                setLookupDir(toUp, B, A);
            }
        }

    }

    console.log('2. PASS | processing window:', windows.length);
    for (let i = 0; i < windows.length; i++) {
        const A = windows[i];
        A.toLeft = buildDirectionWindowAllCombos(A, toLeft);
        A.toRight = buildDirectionWindowAllCombos(A, toRight);
        A.toDown = buildDirectionWindowAllCombos(A, toDown);
        A.toUp = buildDirectionWindowAllCombos(A, toUp);
    }

    console.log('done processing 2-PASS windows!');
    return { toDown, toRight, toLeft, toUp, windows };
}

// 3. Result is ready to be processed by our WFC implementations.