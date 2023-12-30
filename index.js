let scale = 2;
let previewNthCount = 1;
let pickedColor = '#000000';
let pickedThickness = 1;
let showGridLoadedImg = true;
let forceGridLines = false;
const R = 0xFF0000;
const G = 0x00FF00;
const B = 0x0000FF;
const fakeCanvas = document.createElement('canvas');
let EMULATION_RUNNING = false;
let STOP_EMULATION = false;
// DEFAULT IMG.
let imgIn = [
    [G, G, R, G, G],
    [G, R, R, R, G],
    [G, R, B, R, R],
    [G, R, R, R, G],
    [G, G, R, G, G],
];


async function paintIterativeProbabilityPatternFullyDeductive({ windows }, { W, H }, USE_WEIGHTED_PICK = true) {
    return wfc_paintIterativeProbabilityPatternFullyDeductive({ windows }, { W, H }, USE_WEIGHTED_PICK, false);
}

async function paintIterativeProbabilityPatternFullyDeductivePaintPredictions({ windows }, { W, H }, USE_WEIGHTED_PICK = true) {
    return wfc_paintIterativeProbabilityPatternFullyDeductive({ windows }, { W, H }, USE_WEIGHTED_PICK, true);
}

async function paintIterativeSnakeLinePattern({ windows }, { W, H }, WEIGHTED_PICK) {
    return wfc_paintIterativePattern({ windows }, { W, H }, true, false, WEIGHTED_PICK);
}

async function paintIterativeSnakeLinePatternGreedy({ windows }, { W, H }, WEIGHTED_PICK) {
    return wfc_paintIterativePattern({ windows }, { W, H }, true, true, WEIGHTED_PICK);
}

async function paintIterativeScanLinePattern({ windows }, { W, H }, WEIGHTED_PICK) {
    return wfc_paintIterativePattern({ windows }, { W, H }, false, false, WEIGHTED_PICK);
}

async function paintIterativeScanLinePatternGreedy({ windows }, { W, H }, WEIGHTED_PICK) {
    return wfc_paintIterativePattern({ windows }, { W, H }, false, true, WEIGHTED_PICK);
}

async function paintIterativeProbabilityPattern({ windows }, { W, H }, WEIGHTED_PICK) {
    return wfc_paintIterativeProbabilityPattern({ windows }, { W, H }, false, true, WEIGHTED_PICK)
}

async function paintIterativeProbabilityPatternRecursive({ windows }, { W, H }, WEIGHTED_PICK) {
    return wfc_paintIterativeProbabilityPatternRecursive({ windows }, { W, H }, false, true, WEIGHTED_PICK);
}


function update() {
    window.lookupsCache = null;
    preview();
}

function preview() {
    previewNthCount = +update_preview_nth.value;
    scale = +preview_scale.value;
    const WIN_SIZE = +input_window_size.value;
    let img = {
        mat: imgIn,
        W: imgIn[0].length,
        H: imgIn.length
    }
    drawInputCanvas(img);
    drawInputCanvas(img, fakeCanvas, 1);
    const windows = analyzeInput(img, WIN_SIZE);
    drawAugmentationCanvas(windows);
    const outPixelW = +out_window_width_size.value;
    const outPixelH = +out_window_height_size.value;
    disp_canvas.width = outPixelW * WIN_SIZE * scale;
    disp_canvas.height = outPixelH * WIN_SIZE * scale;
}

function getAlgorithm() {
    switch (algo_selection.value) {
        case 'lineScan': return paintIterativeScanLinePattern;
        case 'lineScanGreed': return paintIterativeScanLinePatternGreedy;
        case 'lineSnakeScan': return paintIterativeSnakeLinePattern;
        case 'lineSnakeScanGreed': return paintIterativeSnakeLinePatternGreedy;
        case 'neighborIter': return paintIterativeProbabilityPattern;
        case 'neighborRecurse': return paintIterativeProbabilityPatternRecursive;
        case 'fullyDeductiveNeighbor': return paintIterativeProbabilityPatternFullyDeductive;
        case 'fullyDeductiveNeighborPaintPredictions': return paintIterativeProbabilityPatternFullyDeductivePaintPredictions;
        default: return () => { alert('unknown algo'); throw new Error('not implemented'); };
    }
}

async function run() {
    if (!EMULATION_RUNNING) {
        EMULATION_RUNNING = true;
    } else {
        STOP_EMULATION = true;
        return;
    }

    const USE_WEIGHTED = weighted_checkbox.checked;
    try {
        var prevValue = run_btn.innerText;
        run_btn.innerText = 'preparing algorithm, this may take a while...';
        run_btn.disabled = true;
        await sleepMs(100);
        const WIN_SIZE = +input_window_size.value;
        let img = imgInToImg(imgIn);
        drawInputCanvas(img);
        if (!window.lookupsCache) {
            window.lookupsCache = {};
            const windows = analyzeInput(img, WIN_SIZE);
            drawAugmentationCanvas(windows);
            window.lookupsCache.lookups = constructConcatenationLookups(windows);
        } else {
            window.lookupsCache.lookups.windows = shuffle(window.lookupsCache.lookups.windows);
        }
    } finally {
        run_btn.innerText = prevValue;
        run_btn.disabled = false;
        await sleepMs(100);
    }
    const { lookups } = window.lookupsCache;
    const outPixelW = +out_window_width_size.value;
    const outPixelH = +out_window_height_size.value;
    try {
        const algo = getAlgorithm();
        try {
            var prevValue = run_btn.innerText;
            run_btn.innerText = 'Running... (click to stop)';
            await algo(lookups, { W: outPixelW, H: outPixelH }, USE_WEIGHTED);
        } finally {
            run_btn.innerText = prevValue;
        }
    } finally {
        STOP_EMULATION = false;
        EMULATION_RUNNING = false;
    }
}


function main() {
    thickness_input.value = pickedThickness;
    colorpicker.value = pickedColor;
    update_preview_nth.value = previewNthCount = 1;

    let mouseIsDown = false;
    const fakeCtx = fakeCanvas.getContext('2d');

    function onCanvasActionComplete() {
        imgIn = canvasToImgIn(fakeCanvas);
        update(true);
    }

    function colorCanvas(e, preview = false) {
        const ctx = input_canvas.getContext('2d');
        const { x, y } = getMousePos(input_canvas, e);
        const thickness = pickedThickness;
        const cellX = Math.floor(x / scale);
        const cellY = Math.floor(y / scale);
        ctx.fillStyle = pickedColor;
        fakeCtx.fillStyle = pickedColor;

        ctx.fillRect(cellX * scale, cellY * scale, scale * thickness, scale * thickness);
        if (!preview) {
            fakeCtx.fillRect(cellX, cellY, 1 * thickness, 1 * thickness);
        }
        const img = imgInToImg(imgIn);
        if (forceGridLines) {
            drawGrid(img);
        }
        if (preview) {
            drawInputCanvas(img);
            ctx.fillStyle = pickedColor;
            ctx.fillRect(cellX * scale, cellY * scale, scale * thickness, scale * thickness);
        }
    }

    input_canvas.onmouseenter = () => {
        forceGridLines = showGridLoadedImg;
    }

    input_canvas.onmouseout = () => {
        forceGridLines = false;
        if (mouseIsDown) {
            onCanvasActionComplete()
            mouseIsDown = false;
        } else {
            const img = imgInToImg(imgIn);
            drawInputCanvas(img);
            // update(true);
        }
    }

    input_canvas.onmousedown = (e) => {
        mouseIsDown = true;
        if (EMULATION_RUNNING) {
            STOP_EMULATION = true;
        }
        colorCanvas(e);
    }

    input_canvas.onmouseup = (e) => {
        if (mouseIsDown) {
            colorCanvas(e);
            onCanvasActionComplete();
        }
        mouseIsDown = false;
    }

    input_canvas.onmousemove = (e) => {
        if (!mouseIsDown) return colorCanvas(e, true);
        colorCanvas(e);
        return false;
    }

    update();
}