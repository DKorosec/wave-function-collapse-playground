function imgInToImg(imgIn) {
    return {
        mat: imgIn,
        W: imgIn[0].length,
        H: imgIn.length
    };
}

function newColorPicked(color) {
    pickedColor = color;
}

function newThickness(thickness) {
    pickedThickness = thickness;
}

function onNewBlankCanvas() {
    const w = +input_blank_w.value;
    const h = +input_blank_h.value;
    fakeCanvas.width = w;
    fakeCanvas.height = h;
    const ctx = fakeCanvas.getContext('2d');
    ctx.fillStyle = pickedColor;
    ctx.fillRect(0, 0, w, h);
    imgIn = canvasToImgIn(fakeCanvas);
    update(true);
    const complementClr = complementHex(pickedColor);
    newColorPicked(complementClr);
    colorpicker.value = complementClr;
}

function rgbToInt(r, g, b) {
    const red = r.toString(16).padStart(2, '0');
    const green = g.toString(16).padStart(2, '0');
    const blue = b.toString(16).padStart(2, '0');
    return parseInt(`0x${red}${green}${blue}`, 16);
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function canvasToImgIn(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hexArray = [];
    for (let i = 0; i < imageData.length; i += 4 * canvas.width) {
        const row = [];
        for (let j = 0; j < 4 * canvas.width; j += 4) {
            const red = imageData[i + j];
            const green = imageData[i + j + 1];
            const blue = imageData[i + j + 2];
            const hex = rgbToInt(red, green, blue);
            row.push(hex);
        }
        hexArray.push(row);
    }

    return hexArray;
}

function handleImage() {
    const input = document.getElementById('imageInput');

    const canvas = document.getElementById('input_canvas');
    const ctx = canvas.getContext('2d');

    const image = new Image();
    const reader = new FileReader();

    reader.onload = function (e) {
        image.onload = function () {
            fakeCanvas.width = canvas.width = image.width;
            fakeCanvas.height = canvas.height = image.height;
            ctx.drawImage(image, 0, 0, image.width, image.height);
            fakeCanvas.getContext('2d').drawImage(canvas, 0, 0, image.width, image.height);
            imgIn = canvasToImgIn(canvas);
            update(true);
        };

        image.src = e.target.result;
    };

    reader.readAsDataURL(input.files[0]);
}

function shuffle(array) {
    return array.map(v => ({ v, r: Math.random() })).sort((a, b) => a.r - b.r).map(v => v.v);
}

function createWindow(size) {
    return new Array(size).fill(null).map(() => new Array(size).fill(0));
}

function windowHash(window) {
    return window.map(r => r.join('_')).join('\n');
}

function n2h(n) {
    return '#' + n.toString(16).padStart(6, '0');
}

function h2n(h) {
    return parseInt('0x' + h.split('#').at(-1), 16);
}

function complementHex(h) {
    return n2h(0xffffff ^ h2n(h));
}

function cloneArray3D(array) {
    return array.map(row => row.map(v => v.map(c => c)));
}

function areSetsEqual(a, b) {
    return a.size === b.size && [...a].every(value => b.has(value));
}

function cloneArray2D(array) {
    return array.map(row => row.map(v => v));
}

function cloneArray1D(array) {
    return array.map(row => row);
}

function pickRandom(arrayOrSet) {
    const r = Array.from(arrayOrSet);
    return r[Math.floor(Math.random() * r.length)];
}

async function sleepMs(ms) {
    if (!ms) return;
    return new Promise(r => setTimeout(r, ms));
}

function drawGrid(imgIn, canvas = null, useScale = null) {
    const { W, H } = imgIn;
    canvas = canvas ?? input_canvas;
    useScale = useScale ?? scale;
    const ctx = canvas.getContext("2d");
    for (let y = 1; y < H; y++) {
        ctx.fillStyle = 'grey';
        ctx.fillRect(0, y * useScale, canvas.width, 1);
    }

    for (let x = 1; x < W; x++) {
        ctx.fillStyle = 'grey';
        ctx.fillRect(x * useScale, 0, 1, canvas.height);
    }
}

function drawInputCanvas(imgIn, canvas = null, useScale = null) {
    const isDefault = canvas == null;
    const { W, H, mat } = imgIn;
    canvas = canvas ?? input_canvas;
    useScale = useScale ?? scale;
    const ctx = canvas.getContext("2d");
    canvas.width = W * useScale;
    canvas.height = H * useScale;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const fill = mat[y][x].toString(16);
            const clr = '#' + fill.padStart(6, '0');
            ctx.fillStyle = clr
            ctx.fillRect(x * useScale, y * useScale, useScale, useScale);
        }
    }

    if (!forceGridLines || !isDefault) {
        return;
    }

    drawGrid(imgIn, canvas, useScale);

}

function drawAugmentationCanvas(windows) {
    windows = cloneArray1D(windows).sort((a, b) => {
        const w = b.repeat - a.repeat;
        if (w !== 0) return Math.sign(w);
        return Math.sign(b.getWindowsCount() - a.getWindowsCount());
    });
    const ctx = aug_canvas.getContext('2d');
    const wsize = windows[0].size;
    const wcount = windows.length;
    aug_canvas.height = wcount * (wsize + 1) * scale;
    const wcaseRots = 8;
    aug_canvas.width = wcaseRots * (wsize + 1) * scale;
    const topPadding = scale;

    for (let j = 0; j < windows.length; j++) {
        const w = windows[j];
        const imgs = w.getWindows();
        for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i];
            for (let y = 0; y < wsize; y++) {
                for (let x = 0; x < wsize; x++) {
                    ctx.fillStyle = n2h(img[y][x]);
                    ctx.fillRect((x + i * (wsize + 1)) * scale, topPadding + (y + j * (wsize + 1)) * scale, scale, scale);
                }
            }
        }
        ctx.fillStyle = 'black';
        ctx.fillText('WEIGHT: ' + w.repeat, 0, topPadding + (j * (wsize + 1)) * scale - 1);
    }
}


function weightedRandomWindowShuffleDesc(windows) {
    return windows.map(window => ({ window, rng: window.weight * Math.random() })).sort((a, b) => b.rng - a.rng).map(v => v.window);
}

function windowsWeightedPickRemove(windows) {
    windows.sort((a, b) => b.weight - a.weight);
    let sum = windows.reduce((a, b) => a + b.weight, 0);
    const rng = Math.random() * sum;
    for (var i = windows.length - 1; i >= 0; --i) {
        var el = windows[i];
        var min = sum - el.weight;
        if (min <= rng) {
            return [el, windows.filter(w => w !== el)];
        }
        sum = min;
    }
    if (windows.length != 0) throw new Error('Logic error');
    return [null, []];
}


function paintMemoryImage(canvas, memoryImg, tileSize, probImg = null, probWindows = null, probWindowsWeighted = false) {
    const ctx = canvas.getContext('2d');
    const H = memoryImg.length;
    const W = memoryImg[0].length;
    canvas.width = W * tileSize * scale;
    canvas.height = H * tileSize * scale;
    for (var y = 0; y < H; y++) {
        for (var x = 0; x < W; x++) {
            const wOffsetX = x * tileSize;
            const wOffsetY = y * tileSize;
            const window = memoryImg[y][x];
            if (probImg) {
                const pwindow = probImg[y][x];
                if (probWindows) {
                    const p = probWindows[y][x];
                    if (!p.collapsed) {
                        var avgw = new Array(tileSize * tileSize * 3).fill(0);
                        var avgwCnt = 0;
                        var maxOpts = probWindowsWeighted ? p.options.reduce((max, c) => Math.max(max, c.weight), 0) : 1;
                        for (var w of p.options) {
                            var weightMul = probWindowsWeighted ? w.weight / maxOpts : 1;
                            avgwCnt += weightMul;
                            for (var wy = 0; wy < tileSize; wy++) {
                                for (var wx = 0; wx < tileSize; wx++) {
                                    var r = (w[wy][wx] >> 16) & 0x0000FF;
                                    var g = (w[wy][wx] >> 8) & 0x0000FF;
                                    var b = w[wy][wx] & 0x0000FF;
                                    var idx = (wy * tileSize + wx) * 3;
                                    avgw[idx + 0] += r * r * weightMul;
                                    avgw[idx + 1] += g * g * weightMul;
                                    avgw[idx + 2] += b * b * weightMul;
                                }
                            }
                        }

                        for (var wy = 0; wy < tileSize; wy++) {
                            for (var wx = 0; wx < tileSize; wx++) {
                                var idx = (wy * tileSize + wx) * 3;
                                var r = Math.floor(Math.sqrt(avgw[idx + 0] / avgwCnt));
                                var g = Math.floor(Math.sqrt(avgw[idx + 1] / avgwCnt));
                                var b = Math.floor(Math.sqrt(avgw[idx + 2] / avgwCnt));
                                var val = (r << 16) | (g << 8) | b;
                                ctx.fillStyle = n2h(val);
                                ctx.fillRect((wOffsetX + wx) * scale, (wOffsetY + wy) * scale, scale, scale);
                            }
                        }
                    }
                } else {
                    ctx.fillStyle = 'red';
                    ctx.fillText(pwindow.toString(), (wOffsetX + tileSize / 2) * scale, (wOffsetY + tileSize / 2) * scale);
                }

            }

            if (window === null) continue;
            for (var wy = 0; wy < tileSize; wy++) {
                for (var wx = 0; wx < tileSize; wx++) {
                    var val = window[wy][wx];
                    ctx.fillStyle = n2h(val);
                    ctx.fillRect((wOffsetX + wx) * scale, (wOffsetY + wy) * scale, scale, scale);
                }
            }
        }
    }
}
