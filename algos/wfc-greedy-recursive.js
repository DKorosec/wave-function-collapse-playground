async function wfc_paintIterativeProbabilityPatternRecursive({ windows }, { W, H }, USE_WEIGHTED_PICK = true) {
    const tileSize = windows[0].length;
    const memoryImg = new Array(H).fill(null).map(() => new Array(W).fill(null));
    let probImg = new Array(H).fill(null).map(() => new Array(W).fill(windows.length));
    probImg.nonNullFields = W * H;

    function cloneProbImg(probImg) {
        const clone = cloneArray2D(probImg);
        clone.nonNullFields = probImg.nonNullFields;
        return clone;
    }

    function solvedProbImg(probImg) {
        return probImg.nonNullFields === 0;
    }

    function setCellOptionsProbImg(probImg, x, y, optsCnt) {
        const prev = probImg[y][x];
        probImg[y][x] = optsCnt;
        if (optsCnt === 0) {
            if (prev === 0) return;
            --probImg.nonNullFields;
        } else {
            if (prev !== 0) return;
            ++probImg.nonNullFields;
        }
    }
    function findNextProbableCell(memoryImg, probImg) {
        let minValue = Infinity;
        let minCells = [];
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const val = probImg[y][x];
                if (val === null || val <= 0) continue;

                if (val < minValue) {
                    minValue = val;
                    minCells = [];
                }
                if (val === minValue) {
                    minCells.push({ x, y, prob: val })
                }
            }
        }
        const cell = minCells[Math.floor(Math.random() * minCells.length)];
        const tiles = findCurrentCellSuperPositions(memoryImg, cell.x, cell.y);
        return { x: cell.x, y: cell.y, tiles, tileIdx: 0, initialProb: tiles.length };
    }

    function findCurrentCellSuperPositions(memoryImg, x, y) {
        const T = memoryImg[y - 1]?.[x];
        const R = memoryImg[y][x + 1];
        const D = memoryImg[y + 1]?.[x];
        const L = memoryImg[y][x - 1];
        return filterSuperPositionsForCell(T, R, D, L) ?? windows;
    }

    function getNextTile(cell) {
        if (USE_WEIGHTED_PICK) {
            const [next, rest] = windowsWeightedPickRemove(cell.tiles);
            cell.tiles = rest;
            return next;
        }
        return cell.tiles[cell.tileIdx++] ?? null;
    }


    let stopperIt = 0;
    async function recurse(_memoryImg, _probImg) {
        const curr = findNextProbableCell(_memoryImg, _probImg);
        while (true) {
            if (STOP_EMULATION) {
                return [_memoryImg, _probImg];
            }

            const releaseLock = stopperIt++ % previewNthCount === 0;
            if (releaseLock) {
                paintMemoryImage(disp_canvas, _memoryImg, tileSize, _probImg);
                await sleepMs(1);
            }

            const probImg = cloneProbImg(_probImg);
            const memoryImg = cloneArray2D(_memoryImg);
            const currTile = getNextTile(curr);

            if (!currTile) {
                return null;
            }

            memoryImg[curr.y][curr.x] = currTile;
            setCellOptionsProbImg(probImg, curr.x, curr.y, 0);

            if (solvedProbImg(probImg)) {
                return [memoryImg, probImg];
            }

            let failedNeighbor = false;
            for (const [ny, nx] of [[curr.y - 1, curr.x], [curr.y, curr.x + 1], [curr.y + 1, curr.x], [curr.y, curr.x - 1]]) {
                const neighbor = memoryImg[ny]?.[nx];
                if (neighbor === null) {
                    const superPositions = findCurrentCellSuperPositions(memoryImg, nx, ny);
                    if (superPositions.length === 0) {
                        failedNeighbor = true;
                        break;
                    }
                    setCellOptionsProbImg(probImg, nx, ny, superPositions.length);
                }
            }

            if (!failedNeighbor) {
                const result = await recurse(memoryImg, probImg);
                if (result) {
                    return result;
                }
            }
        }
    }

    const [paintImg, statImg] = await recurse(memoryImg, probImg);
    paintMemoryImage(disp_canvas, paintImg, tileSize, statImg);
}