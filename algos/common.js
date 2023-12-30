class SuperPositionImage {
    constructor(mat, size) {
        this.positions = [];
        this.construct(mat, size);
    }

    construct(mat, size) {
        const tmpPos = [];
        tmpPos.push(mat);
        for (let i = 0; i < 3; i++) tmpPos.push(this.rotate90(tmpPos.at(-1), size));
        tmpPos.push(this.flip(mat, size));
        for (let i = 0; i < 3; i++) tmpPos.push(this.rotate90(tmpPos.at(-1), size));

        const seenSet = new Set();
        for (const w of tmpPos) {
            const hash = windowHash(w);
            if (seenSet.has(hash)) {
                continue;
            }
            seenSet.add(hash);
            this.positions.push(w);
        }
    }

    clone(mat, size) {
        const w = createWindow(size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                w[y][x] = mat[y][x];
            }
        }
        return w;
    }

    rotate90(mat, size) {
        const rot = this.clone(mat, size);
        for (let i = 0; i < size; i++) {
            for (let x = 0; x < size; x++) {
                rot[x][size - i - 1] = mat[i][x];
            }
        }
        return rot;
    }

    flip(mat, size) {
        const flp = this.clone(mat, size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                flp[y][x] = mat[y][size - x - 1];
            }
        }
        return flp;
    }
}

class ObservingWindow {
    constructor(size) {
        this.size = size;
        this.img = null;
        this.repeat = 1;
    }

    getWindowsCount() {
        return this.img.positions.length;
    }

    getWindows() {
        return this.img.positions.map(p => {
            p.weight = this.repeat;
            p.uniqRotatorId = this;
            return p;
        });
    }

    consume(mat, offsetX, offsetY) {
        const matSizeH = mat.length;
        const matSizeW = mat[0].length;
        const img = createWindow(this.size);
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const val = mat[(offsetY + y) % matSizeH][(offsetX + x) % matSizeW];
                if (val === undefined) {
                    throw new Error('should not happen.');
                }
                img[y][x] = val;
            }
        }
        this.img = new SuperPositionImage(img, this.size);
    }

    windowHashes() {
        return this.img.positions.map(w => windowHash(w));
    }
}

function filterSuperPositionsForCell(top, right, down, left) {
    const T = top?.toDown ?? null;
    const R = right?.toLeft ?? null;
    const D = down?.toUp ?? null;
    const L = left?.toRight ?? null;
    const [min, ...rest] = [T, R, D, L].filter(v => v !== null).sort((a, b) => a.set.size - b.set.size);
    if (!min) {
        // everything fits there.
        return null;
    }
    const commonTiles = min.array.filter(v => rest.every(neighbor => neighbor.set.has(v)));
    return commonTiles;
}
