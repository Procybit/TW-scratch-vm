// Due to the existence of features such as interpolation and "0 FPS" being treated as "screen refresh rate",
// The VM loop logic has become much more complex

// Use setTimeout to polyfill requestAnimationFrame in Node.js environments
const _requestAnimationFrame = typeof requestAnimationFrame === 'function' ?
    requestAnimationFrame :
    (f => setTimeout(f, 1000 / 60));
const _cancelAnimationFrame = typeof requestAnimationFrame === 'function' ?
    cancelAnimationFrame :
    clearTimeout;

const animationFrameWrapper = callback => {
    let id;
    const handle = () => {
        id = _requestAnimationFrame(handle);
        callback();
    };
    const cancel = () => _cancelAnimationFrame(id);
    id = _requestAnimationFrame(handle);
    return {
        cancel
    };
};

const DEFAULT_FRAMERATE = 60;

class FrameLoop {
    constructor (vm) {
        this.running = false;
        this.framerate = DEFAULT_FRAMERATE;
        this.interpolation = false;
        this.stepTime = 1000 / DEFAULT_FRAMERATE;

        this.stepCallback = vm._step.bind(vm);
        this.interpolationCallback = vm._renderInterpolatedPositions.bind(vm);

        this._stepInterval = null;
        this._interpolationAnimation = null;
        this._stepAnimation = null;
    }

    setFramerate (fps) {
        this.framerate = fps;
        this._restart();
    }

    setInterpolation (interpolation) {
        this.interpolation = interpolation;
        this._restart();
    }

    _restart () {
        if (this.running) {
            this.stop();
            this.start();
        }
    }

    start () {
        this.running = true;
        if (this.framerate === 0) {
            this._stepAnimation = animationFrameWrapper(this.stepCallback);
            this.stepTime = 1000 / DEFAULT_FRAMERATE;
        } else {
            // Interpolation should never be enabled when framerate === 0 as that's just redundant
            if (this.interpolation) {
                this._interpolationAnimation = animationFrameWrapper(this.interpolationCallback);
            }
            this._stepInterval = setInterval(this.stepCallback, 1000 / this.framerate);
            this.stepTime = 1000 / this.framerate;
        }
    }

    stop () {
        this.running = false;
        clearInterval(this._stepInterval);
        if (this._interpolationAnimation) {
            this._interpolationAnimation.cancel();
        }
        if (this._stepAnimation) {
            this._stepAnimation.cancel();
        }
        this._interpolationAnimation = null;
        this._stepAnimation = null;
    }
}

module.exports = FrameLoop;
