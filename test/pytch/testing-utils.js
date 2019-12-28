"use strict";


////////////////////////////////////////////////////////////////////////////////

const fs = require("fs");
const reqskulpt = require('../../support/run/require-skulpt').requireSkulpt;

before(() => {
    // Inject 'Sk' object into global namespace.
    reqskulpt(false);

    ////////////////////////////////////////////////////////////////////////////////
    //
    // API dependencies for Skulpt

    global.mock_keyboard = (() => {
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

        return {
            press_key,
            release_key,
            drain_new_keydown_events,
        };
    })();

    // Connect read/write to filesystem and stdout; configure Pytch environment.
    Sk.configure({
        read: (fname => fs.readFileSync(fname, { encoding: "utf8" })),
        output: (args) => { process.stdout.write(args); },
        pytch: {
            async_load_image: (url => Promise.resolve(new MockImage(url))),
            keyboard: mock_keyboard,
        },
    });


    ////////////////////////////////////////////////////////////////////////////////
    //
    // Test helpers

    global.import_local_file = (fname => {
        let code_text = fs.readFileSync(fname, { encoding: "utf8" });
        let do_import = Sk.importMainWithBody("<stdin>", false, code_text, true);
        return Sk.misceval.asyncToPromise(() => do_import);
    });

    global.assert = require("assert");

    global.py_getattr = (py_obj, js_attr_name) =>
        Sk.builtin.getattr(py_obj, Sk.builtin.str(js_attr_name));

    global.js_getattr = (py_obj, js_attr_name) =>
        Sk.ffi.remapToJs(py_getattr(py_obj, js_attr_name));

    global.call_method = (py_obj, js_methodname, js_args) => {
        let fun = py_getattr(py_obj, js_methodname);
        let py_args = js_args.map(Sk.ffi.remapToPy);
        let py_result = Sk.misceval.callsimArray(fun, py_args);
        return Sk.ffi.remapToJs(py_result);
    };

    ////////////////////////////////////////////////////////////////////////////////
    //
    // Images: Do not actually load anything from the network.  Instead keep a
    // map of URL to width and height, and create a mock image with the right
    // properties.  Some of the images used in tests won't truly exist.

    const image_size_from_url = {
        "library/images/question-mark.png": [32, 32],
        "library/images/marching-alien.png": [60, 20],
        "library/images/firing-alien.png": [80, 30],
        "library/images/ball.png": [16, 16],
        "library/images/square-80x80.png": [80, 80],
        "library/images/rectangle-60x30.png": [60, 30],
    };

    class MockImage {
        constructor(url) {
            let size = image_size_from_url[url];
            this.url = url;
            this.width = size[0];
            this.height = size[1];
        }
    }


    ////////////////////////////////////////////////////////////////////////////////
    //
    // Specialised testing predicates.

    global.assert_Appearance_equal = (got_appearance,
                                      exp_img_url, exp_img_wd, exp_img_ht,
                                      exp_centre_x,
                                      exp_centre_y) => {
        assert.equal(got_appearance.image.url, exp_img_url);
        assert.equal(got_appearance.image.width, exp_img_wd);
        assert.equal(got_appearance.image.height, exp_img_ht);
        assert.strictEqual(got_appearance.centre_x, exp_centre_x)
        assert.strictEqual(got_appearance.centre_y, exp_centre_y);
    };

    global.assert_renders_as = (label,
                                project,
                                exp_render_instrns) => {
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
            case "RenderImage":
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
            default:
                assert.ok(null,
                          `unknown instruction kind "${got_instr.kind}"`);
            }
        });
    };

    global.assert_has_bbox = (label, actor_instance,
                              exp_xmin, exp_xmax,
                              exp_ymin, exp_ymax) => {
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
});
