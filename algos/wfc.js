async function wfc_paintIterativeProbabilityPatternFullyDeductive({ windows }, { W, H }, USE_WEIGHTED_PICK = true, PAINT_PREDICTIONS = true) {
    const tileSize = windows[0].length;
    // initially every cell has all super positions.
    const superPositionImg = new Array(H).fill(null).map(() => new Array(W).fill(null).map(() => (
        {
            collapsed: false,
            options: shuffle(cloneArray1D(windows))
        }
    )));
    superPositionImg.unresolvedFields = H * W;

    function cloneSuperPositionImg(spi) {
        const clone = spi.map(row => row.map(cell => ({ options: cell.options, collapsed: cell.collapsed })));
        clone.unresolvedFields = spi.unresolvedFields;
        return clone;
    }

    function superPositionImgToDisplayImg(spi) {
        return spi.map(row => row.map(cell => cell.collapsed ? cell.options[0] : null));
    }

    function superPositionImgToStatImg(spi) {
        return spi.map(row => row.map(cell => cell.options.length));
    }

    function paintSuperPositionImg(spi) {
        paintMemoryImage(disp_canvas, superPositionImgToDisplayImg(spi), tileSize, superPositionImgToStatImg(spi), PAINT_PREDICTIONS ? spi : null, PAINT_PREDICTIONS ? USE_WEIGHTED_PICK : false);
    }

    function pickLeastEntropyField(spi) {
        let minValue = Infinity;
        let minCells = [];
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const { options, collapsed } = spi[y][x];
                if (options.length === 0) throw new Error('solution does not exists');
                if (collapsed) continue;
                if (options.length < minValue) {
                    minValue = options.length;
                    minCells = [];
                }
                if (options.length === minValue) {
                    minCells.push({ x, y, cell: options });
                }
            }
        }
        const cell = minCells[Math.floor(Math.random() * minCells.length)];
        const tiles = findCurrentCellSuperPositions(spi, cell.x, cell.y);
        return { x: cell.x, y: cell.y, tiles, tileIdx: 0 };
    }

    function findCurrentCellSuperPositions(spi, x, y) {
        return spi[y][x].options;
    }

    function getNeighborCoordsXY_TRDL(x, y) {
        return [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]];
    }

    function getAllSuperPositionWindowsArray(x, y, spi) {
        const [Tc, Rc, Dc, Lc] = getNeighborCoordsXY_TRDL(x, y);
        const [T, R, D, L] = [[Tc, 'toDown'], [Rc, 'toLeft'], [Dc, 'toUp'], [Lc, 'toRight']].map(([[nx, ny], direction]) => {
            const options = spi[ny]?.[nx]?.options;
            if (!options) {
                return null;
            }
            return options.map(opt => opt[direction].set).reduce((acc, cur) => {
                for (const element of cur) {
                    acc.add(element);
                }
                return acc;
            }, new Set());
        });
        const [min, ...rest] = [T, R, D, L].filter(v => v !== null).sort((a, b) => a.size - b.size);
        if (!min) {
            throw new Error('should not happen');
        }
        const minArray = Array.from(min);
        const commonTiles = minArray.filter(v => rest.every(neighbor => neighbor.has(v)));
        return commonTiles;
    }

    function deductAllNeighbors(cell, spi) {
        const stack = getNeighborCoordsXY_TRDL(cell.x, cell.y);
        while (stack.length) {
            const [currX, currY] = stack.shift();
            const curr = spi[currY]?.[currX];
            if (!curr || curr.collapsed) {
                continue;
            }
            const currSuperPositions = curr.options;
            const newCurrSuperPositionsArray = getAllSuperPositionWindowsArray(currX, currY, spi);
            if (newCurrSuperPositionsArray.length === 0) {
                return false;
            }
            const changed = !areSetsEqual(new Set(newCurrSuperPositionsArray), new Set(currSuperPositions))
            if (changed) {
                applyNewSuperPositionsAtPosition(newCurrSuperPositionsArray, currX, currY, spi);
                stack.push(...getNeighborCoordsXY_TRDL(currX, currY));
            }
        }
        return true;
    }

    function getNextTile(cell) {
        if (USE_WEIGHTED_PICK) {
            const [next, rest] = windowsWeightedPickRemove(cell.tiles);
            cell.tiles = rest;
            return next;
        }
        return cell.tiles[cell.tileIdx++] ?? null;
    }

    function applyNewSuperPositionsAtPosition(superPositions, x, y, spi) {
        const position = spi[y][x];
        if (position.collapsed || superPositionImg.length === 0) throw new Error('logic error');
        position.options = superPositions;
    }

    function applyTileAtField(tile, cell, spi) {
        const position = spi[cell.y][cell.x];
        position.options = [tile];
        position.collapsed = true;
        --spi.unresolvedFields;
    }

    function isSolved(spi) {
        return spi.unresolvedFields === 0;
    }

    let stopperIt = 0;
    async function recurse(_spi) {
        const curr = pickLeastEntropyField(_spi);
        while (1) {
            if (STOP_EMULATION) {
                return _spi;
            }

            const releaseLock = stopperIt++ % previewNthCount === 0;
            if (releaseLock) {
                paintSuperPositionImg(_spi);
                await sleepMs(1);
            }

            const spi = cloneSuperPositionImg(_spi);
            const tile = getNextTile(curr);
            if (!tile) {
                return null;
            }
            applyTileAtField(tile, curr, spi);
            if (isSolved(spi)) {
                return spi;
            }
            const positionDeductible = deductAllNeighbors(curr, spi);
            if (positionDeductible) {
                const solution = await recurse(spi);
                if (solution !== null) {
                    return solution;
                }
            }
        }
    }

    const spiResult = await recurse(cloneSuperPositionImg(superPositionImg));
    paintSuperPositionImg(spiResult);
}

async function wfc_render_after({ windows }, { W, H }, USE_WEIGHTED_PICK = true, PAINT_PREDICTIONS = true) {
    const tileSize = windows[0].length;
    // initially every cell has all super positions.
    const superPositionImg = new Array(H).fill(null).map(() => new Array(W).fill(null).map(() => (
        {
            collapsed: false,
            options: shuffle(cloneArray1D(windows))
        }
    )));
    superPositionImg.unresolvedFields = H * W;

    function cloneSuperPositionImg(spi) {
        const clone = spi.map(row => row.map(cell => ({ options: cell.options, collapsed: cell.collapsed })));
        clone.unresolvedFields = spi.unresolvedFields;
        return clone;
    }

    function superPositionImgToDisplayImg(spi) {
        return spi.map(row => row.map(cell => cell.collapsed ? cell.options[0] : null));
    }

    function superPositionImgToStatImg(spi) {
        return spi.map(row => row.map(cell => cell.options.length));
    }

    function paintSuperPositionImg(spi, canvas = disp_canvas) {
        paintMemoryImage(canvas, superPositionImgToDisplayImg(spi), tileSize, superPositionImgToStatImg(spi), PAINT_PREDICTIONS ? spi : null, PAINT_PREDICTIONS ? USE_WEIGHTED_PICK : false);
    }

    function pickLeastEntropyField(spi) {
        let minValue = Infinity;
        let minCells = [];
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const { options, collapsed } = spi[y][x];
                if (options.length === 0) throw new Error('solution does not exists');
                if (collapsed) continue;
                if (options.length < minValue) {
                    minValue = options.length;
                    minCells = [];
                }
                if (options.length === minValue) {
                    minCells.push({ x, y, cell: options });
                }
            }
        }
        const cell = minCells[Math.floor(Math.random() * minCells.length)];
        const tiles = findCurrentCellSuperPositions(spi, cell.x, cell.y);
        return { x: cell.x, y: cell.y, tiles, tileIdx: 0 };
    }

    function findCurrentCellSuperPositions(spi, x, y) {
        return spi[y][x].options;
    }

    function getNeighborCoordsXY_TRDL(x, y) {
        return [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]];
    }

    function getAllSuperPositionWindowsArray(x, y, spi) {
        const [Tc, Rc, Dc, Lc] = getNeighborCoordsXY_TRDL(x, y);
        const [T, R, D, L] = [[Tc, 'toDown'], [Rc, 'toLeft'], [Dc, 'toUp'], [Lc, 'toRight']].map(([[nx, ny], direction]) => {
            const options = spi[ny]?.[nx]?.options;
            if (!options) {
                return null;
            }
            return options.map(opt => opt[direction].set).reduce((acc, cur) => {
                for (const element of cur) {
                    acc.add(element);
                }
                return acc;
            }, new Set());
        });
        const [min, ...rest] = [T, R, D, L].filter(v => v !== null).sort((a, b) => a.size - b.size);
        if (!min) {
            throw new Error('should not happen');
        }
        const minArray = Array.from(min);
        const commonTiles = minArray.filter(v => rest.every(neighbor => neighbor.has(v)));
        return commonTiles;
    }

    function deductAllNeighbors(cell, spi) {
        const stack = getNeighborCoordsXY_TRDL(cell.x, cell.y);
        while (stack.length) {
            const [currX, currY] = stack.shift();
            const curr = spi[currY]?.[currX];
            if (!curr || curr.collapsed) {
                continue;
            }
            const currSuperPositions = curr.options;
            const newCurrSuperPositionsArray = getAllSuperPositionWindowsArray(currX, currY, spi);
            if (newCurrSuperPositionsArray.length === 0) {
                return false;
            }
            const changed = !areSetsEqual(new Set(newCurrSuperPositionsArray), new Set(currSuperPositions))
            if (changed) {
                applyNewSuperPositionsAtPosition(newCurrSuperPositionsArray, currX, currY, spi);
                stack.push(...getNeighborCoordsXY_TRDL(currX, currY));
            }
        }
        return true;
    }

    function getNextTile(cell) {
        if (USE_WEIGHTED_PICK) {
            const [next, rest] = windowsWeightedPickRemove(cell.tiles);
            cell.tiles = rest;
            return next;
        }
        return cell.tiles[cell.tileIdx++] ?? null;
    }

    function applyNewSuperPositionsAtPosition(superPositions, x, y, spi) {
        const position = spi[y][x];
        if (position.collapsed || superPositionImg.length === 0) throw new Error('logic error');
        position.options = superPositions;
    }

    function applyTileAtField(tile, cell, spi) {
        const position = spi[cell.y][cell.x];
        position.options = [tile];
        position.collapsed = true;
        --spi.unresolvedFields;
    }

    function isSolved(spi) {
        return spi.unresolvedFields === 0;
    }

    function recurse(_spi) {
        const curr = pickLeastEntropyField(_spi);
        while (1) {
            const spi = cloneSuperPositionImg(_spi);
            const tile = getNextTile(curr);
            if (!tile) {
                return null;
            }
            applyTileAtField(tile, curr, spi);
            if (isSolved(spi)) {
                return [spi];
            }
            const positionDeductible = deductAllNeighbors(curr, spi);
            if (positionDeductible) {
                const solution = recurse(spi);
                if (solution !== null) {
                    return [spi, ...solution];
                }
            }
        }
    }


    const spiResults = recurse(cloneSuperPositionImg(superPositionImg));
    const tmpCanvas = document.createElement('canvas');
    const ctx = tmpCanvas.getContext('2d');
    const imgsData = [];
    for (const spi of spiResults) {
        paintSuperPositionImg(spi, tmpCanvas);
        const imgData = ctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        imgsData.push(imgData);
    }
    const displayCtx = disp_canvas.getContext('2d');
    while (1) {
        for (const imgData of imgsData) {
            displayCtx.putImageData(imgData, 0, 0);
            await sleepMs(16);
        }
        imgsData.reverse();
    }
}