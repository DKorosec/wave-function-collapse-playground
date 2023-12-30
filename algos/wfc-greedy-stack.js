async function wfc_paintIterativeProbabilityPattern({ windows }, { W, H }, USE_WEIGHTED_PICK = true) {
    const tileSize = windows[0].length;
    const memoryImg = new Array(H).fill(null).map(() => new Array(W).fill(null));
    let probImg = new Array(H).fill(null).map(() => new Array(W).fill(windows.length));
    probImg.nonNullFields = W * H;

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

    function resetCurrPos(curr, memoryImg, probImg) {
        memoryImg[curr.y][curr.x] = null;
        [[curr.y, curr.x], [curr.y - 1, curr.x], [curr.y, curr.x + 1], [curr.y + 1, curr.x], [curr.y, curr.x - 1]].forEach(([ny, nx]) => {
            const neighbor = memoryImg[ny]?.[nx];
            if (neighbor === null) {
                const superPositions = findCurrentCellSuperPositions(memoryImg, nx, ny);
                setCellOptionsProbImg(probImg, nx, ny, superPositions.length)
            }
        });
    }

    function getNextTile(cell) {
        if (USE_WEIGHTED_PICK) {
            const [next, rest] = windowsWeightedPickRemove(cell.tiles);
            cell.tiles = rest;
            return next;
        }
        return cell.tiles[cell.tileIdx++] ?? null;
    }

    const initStart = findNextProbableCell(memoryImg, probImg);
    const stack = [initStart];

    for (let stopperIt = 0; true; stopperIt++) {
        if (STOP_EMULATION) {
            break;
        }
        // set current available tile
        const curr = stack.at(-1);
        const currTile = getNextTile(curr);
        if (!currTile) {
            // all options exhausted
            // pop yourself out of the stack, and let your parent decide what to do.
            resetCurrPos(curr, memoryImg, probImg);
            stack.pop();
            continue;
        }

        memoryImg[curr.y][curr.x] = currTile;
        setCellOptionsProbImg(probImg, curr.x, curr.y, 0);

        // calculate probabilities around your cell (neighbors).
        const neighborPositions = [[curr.y - 1, curr.x], [curr.y, curr.x + 1], [curr.y + 1, curr.x], [curr.y, curr.x - 1]];
        let successUpdatingNeighbors = true;
        for (const [ny, nx] of neighborPositions) {
            const neighbor = memoryImg[ny]?.[nx];
            if (neighbor === null) {
                const superPositions = findCurrentCellSuperPositions(memoryImg, nx, ny);
                if (superPositions.length === 0) {
                    successUpdatingNeighbors = false;
                    break;
                }
                setCellOptionsProbImg(probImg, nx, ny, superPositions.length);
            }
        }

        if (!successUpdatingNeighbors) {
            // revert all changes made to this branch.
            resetCurrPos(curr, memoryImg, probImg);
            continue;
        }

        const releaseLock = stopperIt % previewNthCount === 0;
        if (releaseLock) {
            paintMemoryImage(disp_canvas, memoryImg, tileSize, probImg);
            await sleepMs(1);
        }

        if (solvedProbImg(probImg)) {
            break;
        }

        // everything went smooth, find next cell to propagate the fill.
        const next = findNextProbableCell(memoryImg, probImg);
        stack.push(next);
    }

    paintMemoryImage(disp_canvas, memoryImg, tileSize, probImg);
}