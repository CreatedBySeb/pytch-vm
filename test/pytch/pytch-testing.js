"use strict";


////////////////////////////////////////////////////////////////////////////////

const fs = require("fs");
const assert = require("assert");


////////////////////////////////////////////////////////////////////////////////
//
// Run mocha test functions importing a particular Python file.
//
// The main test set-up funtions are with_module() and with_project().
// See existing tests for examples.
//
// The test_fun() is passed an async function rather than the actual
// result of importing the module, to defer the work of loading and
// compiling the module until we know we want to run that test.  If we
// use the "--grep" command-line option to mocha, we don't want to
// import Python modules for tests that won't be run.

const with_module = (fname, test_fun) => {
    let full_code_text = fs.readFileSync(fname, { encoding: "utf8" });
    test_fun(() => import_from_text(full_code_text));
};

const auto_config_cut_regex = /^.*--cut-here-for-auto-config--/m;

const with_project = (fname, test_fun) => {
    let full_code_text = fs.readFileSync(fname, { encoding: "utf8" });

    // Import project as-is.
    test_fun(() => import_project(full_code_text));

    // See whether we need to cut out the manual config code, and run
    // the test with auto-config.
    const cut_mark_loc = full_code_text.search(auto_config_cut_regex);
    if (cut_mark_loc === -1)
        return;

    const code_text = full_code_text.slice(0, cut_mark_loc);

    describe("(auto config)", () => {
        test_fun(() => import_project(code_text));
    });
};

const import_from_text = (code_text) => {
    return Sk.misceval.asyncToPromise(
        () => Sk.importMainWithBody("<stdin>", false, code_text, true)
    );
};

const import_project = async (code_text) => {
    let module = await Sk.pytchsupport.import_with_auto_configure(code_text);
    let py_project = module.$d.project || module.$d.$auto_created_project;
    return py_project.js_project;
};


////////////////////////////////////////////////////////////////////////////////

const PytchAssetLoadError = (...args) => {
    return new Sk.pytchsupport.PytchAssetLoadError(...args);
}


////////////////////////////////////////////////////////////////////////////////

const mock_keyboard = (() => {
    let undrained_keydown_events = [];
    let key_is_down = {};

    const press_key = (keyname) => {
        key_is_down[keyname] = true;
        undrained_keydown_events.push(keyname);
    };

    const release_key = (keyname) => {
        key_is_down[keyname] = false;
    };

    const drain_new_keydown_events = () => {
        let evts = undrained_keydown_events;
        undrained_keydown_events = [];
        return evts;
    };

    const key_is_pressed = (keyname => (key_is_down[keyname] || false));

    return {
        press_key,
        release_key,
        key_is_pressed,
        drain_new_keydown_events,
    };
})();

const mock_mouse = (() => {
    let undrained_clicks = [];
    let pointer_stage_x = 0.0;
    let pointer_stage_y = 0.0;

    const stage_coords = () => ({ stage_x: pointer_stage_x,
                                  stage_y: pointer_stage_y });

    const move = (x, y) => {
        pointer_stage_x = x;
        pointer_stage_y = y;
    };

    const click = () => { undrained_clicks.push(stage_coords()); };

    const click_at = (x, y) => {
        move(x, y);
        click();
    };

    const drain_new_click_events = () => {
        let evts = undrained_clicks;
        undrained_clicks = [];
        return evts;
    };

    return {
        click_at,
        drain_new_click_events,
    };
})();

const mock_sound_manager = (() => {
    let running_performances_ = [];

    let running_performances = () => running_performances_;

    let async_load_sound = ((tag, url) => {
        let maybe_sound = MockSound.maybe_create(mock_sound_manager, tag, url);
        if (maybe_sound === null) {
            let error_message = `could not load sound "${url}"`;
            let py_error = PytchAssetLoadError(error_message, "sound", url);
            return Promise.reject(py_error);
        } else
            return Promise.resolve(maybe_sound);
    });

    let register_running_performance = (performance => {
        running_performances_.push(performance);
    });

    let one_frame = () => {
        running_performances_.forEach(p => {
            p.n_frames_left -= 1;
            if (p.n_frames_left < 0)
                p.n_frames_left = 0;
            if (p.n_frames_left == 0)
                p.has_ended = true;

            running_performances_
                = running_performances_.filter(p => (! p.has_ended));
        });
    };

    let stop_all_performances = (() => {
        running_performances_.forEach(p => p.has_ended = true);
        running_performances_ = [];
    });

    return {
        running_performances,
        async_load_sound,
        register_running_performance,
        one_frame,
        stop_all_performances,
    };
})();

const pytch_stdout = (() => {
    let uncollected_stdout = "";

    const append_stdout = (text) => {
        uncollected_stdout += text;
    };

    const drain_stdout = () => {
        const stdout = uncollected_stdout;
        uncollected_stdout = "";
        return stdout;
    };

    return {
        append_stdout,
        drain_stdout,
    };
})();

const pytch_errors = (() => {
    let uncollected_errors = [];

    const append_error = ((err, ctx) => {
        uncollected_errors.push({err, ctx});
    });

    const drain_errors = (() => {
        let errors = uncollected_errors;
        uncollected_errors = [];
        return errors;
    });

    return {
        append_error,
        drain_errors,
    };
})();


// Implementation of async-load-image.
// Resolve with the MockImage (see below), or reject with a
// Python-level error if the image is not found.
const async_load_mock_image = (url) => {
    let maybe_image = MockImage.maybe_create(url);
    if (maybe_image === null) {
        let error_message = `could not load image "${url}"`;
        let py_error = PytchAssetLoadError(error_message, "image", url);
        return Promise.reject(py_error);
    } else
        return Promise.resolve(maybe_image);
};


////////////////////////////////////////////////////////////////////////////////
//
// Images: Do not actually load anything from the network.  Instead keep a
// map of URL to width and height, and create a mock image with the right
// properties.  Some of the images used in tests won't truly exist.

const image_size_from_url = new Map([
    ["question-mark.png", [32, 32]],
    ["marching-alien.png", [60, 20]],
    ["firing-alien.png", [80, 30]],
    ["ball.png", [16, 16]],
    ["square-80x80.png", [80, 80]],
    ["rectangle-60x30.png", [60, 30]],
    ["solid-white-stage.png", [480, 360]],
    ["yellow-banana.png", [80, 30]],
    ["balloon.png", [100, 200]],
    ["wooden-stage.png", [480, 360]],
]);

class MockImage {
    constructor(url) {
        let size = image_size_from_url.get(url);
        this.url = url;
        this.width = size[0];
        this.height = size[1];
    }

    static maybe_create(url) {
        return (image_size_from_url.has(url)
                ? new MockImage(url)
                : null);
    }
}


////////////////////////////////////////////////////////////////////////////////
//
// Sounds: Do not actually load anything from the network.  Instead keep a
// map of URL to duration in frames, and create a mock sound with the right
// properties.

const sound_duration_from_url = new Map([
    ["trumpet.mp3", 20],
    ["violin.mp3", 10],
]);

class MockSound {
    constructor(parent_sound_manager, tag, url) {
        this.parent_sound_manager = parent_sound_manager;
        this.tag = tag;
        this.filename = url;
        this.duration = sound_duration_from_url.get(url);
    }

    static maybe_create(parent_sound_manager, tag, url) {
        return (sound_duration_from_url.has(url)
                ? new MockSound(parent_sound_manager, tag, url)
                : null);
    }

    launch_new_performance() {
        let performance = new MockSoundPerformance(this.tag, this.duration);
        this.parent_sound_manager.register_running_performance(performance);
        return performance;
    }
}

class MockSoundPerformance {
    constructor(tag, duration) {
        this.tag = tag;
        this.n_frames_left = duration;
        this.has_ended = false;
    }
}


////////////////////////////////////////////////////////////////////////////////
//
// Specialised testing predicates.

const assert_Appearance_equal = (
    got_appearance,
    exp_label,
    exp_img_url,
    exp_img_wd,
    exp_img_ht,
    exp_centre_x,
    exp_centre_y
) => {
    assert.equal(got_appearance.label, exp_label);
    assert.equal(got_appearance.image.url, exp_img_url);
    assert.deepStrictEqual(got_appearance.size, [exp_img_wd, exp_img_ht]);
    assert.deepStrictEqual(got_appearance.centre, [exp_centre_x, exp_centre_y]);
};

const assert_renders_as = (label, project, exp_render_instrns) => {
    let got_render_instrns = project.rendering_instructions();

    let exp_n_instrns = exp_render_instrns.length;
    let got_n_instrns = got_render_instrns.length;
    assert.strictEqual(got_n_instrns, exp_n_instrns,
                       `for ${label}, got ${got_n_instrns} rendering`
                       + ` instruction/s but expected ${exp_n_instrns}`);

    got_render_instrns.forEach((got_instr, idx) => {
        let exp_instr = exp_render_instrns[idx];

        assert.strictEqual(got_instr.kind, exp_instr[0],
                           `at index ${idx} of ${label}, got instruction`
                           + ` of kind "${got_instr.kind}" but expected`
                           + ` kind "${exp_instr[0]}"`);

        switch(got_instr.kind) {
        case "RenderImage": {
            let pfx = `in RenderImage at index ${idx} of ${label}`;
            assert.ok(((got_instr.x == exp_instr[1])
                       && (got_instr.y == exp_instr[2])),
                      `${pfx}, got coords (${got_instr.x}, ${got_instr.y})`
                      + ` but expected (${exp_instr[1]}, ${exp_instr[2]})`);
            assert.ok(got_instr.scale == exp_instr[3],
                      `${pfx}, got scale ${got_instr.scale}`
                      + ` but expected ${exp_instr[3]}`);
            assert.ok(got_instr.image_label == exp_instr[4],
                      `${pfx}, got image-label "${got_instr.image_label}"`
                      + ` but expected "${exp_instr[4]}"`);
            break;
        }
        case "RenderSpeechBubble": {
            let pfx = `in RenderSpeechBubble at index ${idx} of ${label}`;
            assert.ok((got_instr.content == exp_instr[1]),
                      (`${pfx}, got content "${got_instr.content}"`
                       + ` but expected "${exp_instr[1]}"`));
            assert.ok(((got_instr.tip_x == exp_instr[2])
                       && (got_instr.tip_y == exp_instr[3])),
                      (`${pfx}, got tip coords (${got_instr.tip_x}, ${got_instr.tip_y})`
                       + ` but expected (${exp_instr[2]}, ${exp_instr[3]})`));
            break;
        }
        default:
            assert.ok(null,
                      `unknown instruction kind "${got_instr.kind}"`);
        }
    });
};

const assert_n_speaker_ids = (project, exp_n_speakers) => {
    const speech_instructions = (project
                                 .rendering_instructions()
                                 .filter(i => i.kind === "RenderSpeechBubble"));
    const speaker_ids = new Set(speech_instructions.map(i => i.speaker_id));
    const n_speakers = speaker_ids.size;
    assert.equal(n_speakers, exp_n_speakers,
                 `expected ${exp_n_speakers} speakers but got ${n_speakers}`);
};

const assert_has_bbox = (
    label,
    actor_instance,
    exp_xmin,
    exp_xmax,
    exp_ymin,
    exp_ymax
) => {
    let got_bbox = actor_instance.bounding_box();

    const assert_prop_eq = ((slot, exp_val) => {
        let got_val = got_bbox[slot];
        let msg = (`got ${got_val} for ${slot} of ${label}`
                   + ` but expected ${exp_val}`);
        assert.equal(got_val, exp_val, msg);
    });

    assert_prop_eq("x_min", exp_xmin);
    assert_prop_eq("x_max", exp_xmax);
    assert_prop_eq("y_min", exp_ymin);
    assert_prop_eq("y_max", exp_ymax);
};

////////////////////////////////////////////////////////////////////////////////
//
// Assert that a particular kind of build error was thrown.

const assertBuildError = (err, exp_phase, innerMsgRegExp) => {
    const msg = Sk.builtin.str(err).v;
    assert.ok(
        /^PytchBuildError/.test(msg),
        `did not get PytchBuildError: ${msg}`
    );
    assert.equal(err.phase, exp_phase);

    if (innerMsgRegExp != null) {
        const innerMsg = Sk.builtin.str(err.innerError).v;
        assert.ok(
            innerMsgRegExp.test(innerMsg),
            (`innerError message "${innerMsg}"`
             + ` did not match /${innerMsgRegExp.source}/`)
        );
    }
};

const assertBuildErrorFun = (...args) => {
    return (err) => {
        assertBuildError(err, ...args);
        return true;
    };
};


////////////////////////////////////////////////////////////////////////////////
//
// Convenience methods for access into Python world.

const py_getattr = (py_obj, js_attr_name) =>
    Sk.builtin.getattr(py_obj, Sk.builtin.str(js_attr_name));

const js_getattr = (py_obj, js_attr_name) =>
    Sk.ffi.remapToJs(py_getattr(py_obj, js_attr_name));

const call_method = (py_obj, js_methodname, js_args) => {
    let fun = py_getattr(py_obj, js_methodname);
    let py_args = js_args.map(Sk.ffi.remapToPy);
    let py_result = Sk.misceval.callsimArray(fun, py_args);
    return Sk.ffi.remapToJs(py_result);
};


////////////////////////////////////////////////////////////////////////////////
//
// Small utilities.

const many_frames = (project, n, options = {}) => {
    for (let i = 0; i < n; ++i)
        project.one_frame();

    // The default behaviour is to do the call, so check for either
    // absent "call_rendering_instructions" property or truthy
    // "call_rendering_instructions" property.
    if (
      options.call_rendering_instructions == null ||
      options.call_rendering_instructions
    ) {
      // Discard return value; this call is just to make sure it doesn't
      // give an error.
      project.rendering_instructions();
    }
};


////////////////////////////////////////////////////////////////////////////////
//
// Hooks to run before/after every test.

const configure_mocha = () => {
    beforeEach(() => {
        mock_sound_manager.stop_all_performances();
    });

    afterEach(() => {
        const errors = pytch_errors.drain_errors();

        const error_messages = errors.map(e => Sk.builtin.str(e.err).v);

        assert.strictEqual(errors.length, 0,
                           ("undrained errors at end of test:\n"
                            + error_messages.join("\n")));

        const stdout = pytch_stdout.drain_stdout();
        assert.strictEqual(stdout.length, 0,
                           `undrained stdout at end of test:\n${stdout}`);
    });
};


////////////////////////////////////////////////////////////////////////////////
//
// Support literal code in JS test files
//
// The following copy-n-pasted, with minor modifications, from a WebApp test
// support file; is there a good way to only have this logic in one place?

const allSpaces = new RegExp("^ *$");
const leadWS = new RegExp("^ *");
const deIndent = (rawCode) => {
  const allLines = rawCode.split("\n");

  if (allLines[0] !== "")
    throw Error("need empty first line of code");

  const nLines = allLines.length;
  if (!allSpaces.test(allLines[nLines - 1]))
    throw Error("need all-spaces last line of code");

  const lines = allLines.slice(1, nLines - 1);

  const nonBlankLines = lines.filter((line) => !allSpaces.test(line));
  const nonBlankIndents = nonBlankLines.map(x => leadWS.exec(x)[0].length);
  const minNonBlankIndent = Math.min(...nonBlankIndents);

  const strippedLines = lines.map(x => x.substring(minNonBlankIndent));
  return strippedLines.join("\n") + "\n";
};

const import_deindented = (raw_code_text) => {
    return import_project(deIndent(raw_code_text));
};


////////////////////////////////////////////////////////////////////////////////
//
// Load and configure Skulpt.

require("../../support/run/require-skulpt").requireSkulpt(false, false);

Sk.configure({
    read: (fname => fs.readFileSync(fname, { encoding: "utf8" })),
    output: (args) => { pytch_stdout.append_stdout(args); },
    pytch: {
        async_load_image: async_load_mock_image,
        keyboard: mock_keyboard,
        mouse: mock_mouse,
        sound_manager: mock_sound_manager,
        on_exception: pytch_errors.append_error,
    },
});


////////////////////////////////////////////////////////////////////////////////

module.exports = {
    assert,
    with_project,
    with_module,
    import_deindented,
    mock_mouse,
    mock_keyboard,
    mock_sound_manager,
    pytch_stdout,
    pytch_errors,
    assert_Appearance_equal,
    assert_renders_as,
    assert_n_speaker_ids,
    assert_has_bbox,
    assertBuildError,
    assertBuildErrorFun,
    py_getattr,
    js_getattr,
    call_method,
    many_frames,
    configure_mocha,
}
