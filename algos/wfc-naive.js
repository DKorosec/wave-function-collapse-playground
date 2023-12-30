async function wfc_paintIterativePattern({ windows }, { W, H }, USE_ZIG_ZAG = true, USE_GREEDY = true, USE_WEIGHTED_PICK = true) {
    const tileSize = windows[0].length;
    const memoryImg = new Array(H).fill(null).map(() => new Array(W).fill(null));
    const pickMapper = new Map();
    pickMapper.getMapping = (x, y) => {
        const key = `${x}_${y}`;
        const opt = pickMapper.get(key) ?? { options: null, index: 0 };
        pickMapper.set(key, opt);
        return opt;
    }
    pickMapper.removeMapping = (x, y) => {
        const key = `${x}_${y}`;
        const opt = pickMapper.get(key);
        opt.options = null;
        opt.index = 0;
        pickMapper.set(key, opt);
    }

    const WH = W * H;
    const getXY = (it) => {
        const y = Math.floor(it / W);
        let x = it % W;
        if (USE_ZIG_ZAG && y % 2 === 1) {
            x = W - 1 - x;
        }
        return { x, y };
    }

    const getNextOption = (history) => {
        if (USE_WEIGHTED_PICK) {
            const [next, rest] = windowsWeightedPickRemove(history.options);
            history.options = rest;
            return next;
        }
        return history.options[history.index++] ?? null;
    }

    for (let it = 0, stopperIt = 0; it < WH; it++, stopperIt++) {
        if (STOP_EMULATION) {
            return;
        }
        if (it < 0) {
            throw new Error('all options exhausted');
        }
        const { x, y } = getXY(it);
        const history = pickMapper.getMapping(x, y);
        if (history.options) {
            const next = getNextOption(history);
            memoryImg[y][x] = next;
            if (!next) {
                pickMapper.removeMapping(x, y);
                if (y === 0 || !USE_GREEDY) {
                    it -= 2;
                } else {
                    // remove everything from above, and start again from there.
                    for (let tmpIt = it; true; tmpIt--) {
                        const { x: rx, y: ry } = getXY(tmpIt);
                        if (rx === x && ry === y - 1) {
                            it = tmpIt - 1;
                            break;
                        }
                        pickMapper.removeMapping(rx, ry);
                        memoryImg[ry][rx] = null;
                    }
                }
                continue;
            }
        } else {
            const T = memoryImg[y - 1]?.[x];
            const R = memoryImg[y][x + 1];
            const D = memoryImg[y + 1]?.[x];
            const L = memoryImg[y][x - 1];
            const allSP = filterSuperPositionsForCell(T, R, D, L) ?? windows;
            if (allSP.length === 0) {
                it -= 2;
                continue;
            }
            history.options = allSP;
            memoryImg[y][x] = getNextOption(history);
        }
        const releaseLock = stopperIt % previewNthCount === 0;
        if (releaseLock) {
            paintMemoryImage(disp_canvas, memoryImg, tileSize);
            await sleepMs(1);
        }
    }
    paintMemoryImage(disp_canvas, memoryImg, tileSize);
}