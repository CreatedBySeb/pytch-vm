var $builtinmodule = function (name) {
    let mod = {};

    const skulpt_function = Sk.pytchsupport.skulpt_function;

    const validKeys = [
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
        "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        " ",
        "ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"
    ];

    const validKeyFromLowerCaseLut = new Map(
        validKeys.map(key => [key.toLowerCase(), key])
    );

    const isValidKeyname = (keyname) => validKeys.includes(keyname)

    function suggestedKeyname(invalidKeyname) {
        // Remove symbols and capital letters to suggest a keyname.
        // E.g., "Arrowleft", "arrowLeft" or "Arrow-Left" -> "ArrowLeft".
        const invalidKeynameLower = invalidKeyname.toLowerCase();
        const invalidKeynameCleaned = invalidKeynameLower.replace(/[^a-z0-9]/g, "");
        const suggested_key = validKeyFromLowerCaseLut.get(invalidKeynameCleaned);
        return suggested_key || null;
    }

    function assertPyKeynameValid(py_keyname) {
        if (!Sk.builtin.checkString(py_keyname))
            throw new Sk.builtin.ValueError(
                "keyname must be a string"
            );

        const jsKeyname = py_keyname.v;

        if (isValidKeyname(jsKeyname))
            return;

        if (!jsKeyname)
            throw new Sk.builtin.ValueError(
                `keyname must not be an empty string`
            );

        if (!jsKeyname.trim())
            throw new Sk.builtin.ValueError(
                `keyname must be a valid key; `
                + `if you meant the spacebar, use " " (that's a string `
                + `consisting of a single space character)`
            );

        const maybe_suggestion = suggestedKeyname(jsKeyname)
        if (maybe_suggestion != null)
            throw new Sk.builtin.ValueError(
                `keyname must be a valid key; `
                + `did you mean "${maybe_suggestion}"?`
            );

        throw new Sk.builtin.ValueError(
            `keyname must be a valid key; `
            + `you can use keys from "a" to "z", from "0" to "9", the space `
            + `key: " ", or one of the following: "ArrowLeft", "ArrowDown", `
            + `"ArrowUp", "ArrowRight"`
        );
    }

    mod._assert_keyname_valid = skulpt_function(
        assertPyKeynameValid,
        `(KEYNAME) Throw error if keyname not valid; otherwise continue`,
    );

    const new_pytch_suspension = (syscall_name, syscall_args) => {
        let susp = new Sk.misceval.Suspension();

        susp.data = (() => {
            let data = {
                type: "Pytch",
                subtype: syscall_name,
                subtype_data: syscall_args,
                result: {  // Default is for a syscall to return None
                    kind: "success",
                    value: Sk.builtin.none.none$,
                },
            };
            data.set_success = (value) => {
                data.result = { kind: "success", value };
            };
            data.set_failure = (error) => {
                data.result = { kind: "failure", error };
            };
            return data;
        })();

        susp.resume = () => {
            const result = susp.data.result;

            switch (result.kind) {
            case "success":
                return result.value;
            case "failure":
                throw result.error;
            default:
                throw Error("unknown result-kind");
            }
        };

        return susp;
    };

    const throwIfNoExecutingThread = (
        (syscall_name, maybe_user_function_name) => {
            if (Sk.pytch.executing_thread == null) {
                const user_function_name = (
                    maybe_user_function_name != null
                        ? maybe_user_function_name
                        : syscall_name
                );
                const message = (
                    `${syscall_name}(): must be called while running a`
                    + ` Pytch thread (did you call ${user_function_name}()`
                    + ` at top level in your program?)`
                );
                throw new Sk.builtin.RuntimeError(message);
            }
        }
    );

    mod.yield_until_next_frame = skulpt_function(
        () => {
            const executing_thread = Sk.pytch.executing_thread;

            // Handle case of no executing Pytch Thread, which happens if we're
            // called at the top level of a module.  Be a no-op in this case.
            if (executing_thread == null) {
                const n_iters_done = ++Sk.pytch.n_loop_iterations_during_import;
                const max_n_iters = Sk.pytch.max_n_loop_iterations_during_import;

                if (n_iters_done > max_n_iters) {
                    const msg = (
                        `your program has tried to execute ${n_iters_done}`
                            + " loop iterations, which exceeds the maximum allowed"
                            + ` of ${max_n_iters}, so it seems likely that you`
                            + " have an infinite loop outside an event handler"
                            + " somewhere; if you have a long-running but finite"
                            + " loop, then you can call, for example,"
                            + " pytch.set_max_import_loop_iterations(10000)"
                            + " to increase the limit"
                    );

                    throw new Sk.builtin.RuntimeError(msg);
                }

                return Sk.builtin.none.none$;
            }

            return (executing_thread.should_yield()
                    ? new_pytch_suspension("next-frame", {})
                    : Sk.builtin.none.none$);
        },
        `Pause until the next frame`,
    );

    mod.set_max_import_loop_iterations = skulpt_function(
        (py_max_n_iters) => {
            Sk.builtin.pyCheckType(
                "max_n_iters",
                "number",
                Sk.builtin.checkNumber(py_max_n_iters)
            );

            const max_n_iters = Sk.ffi.remapToJs(py_max_n_iters);

            if (! Number.isInteger(max_n_iters))
                throw new Sk.builtin.ValueError("max_n_iters must be integer");

            if (max_n_iters < 0)
                throw new Sk.builtin.ValueError("max_n_iters must be non-negative");

            Sk.pytch.max_n_loop_iterations_during_import = max_n_iters;
        },
        `(MAX_N_ITERS) Set max allowed import-time loop iterations`,
    );

    mod.push_loop_iterations_per_frame = skulpt_function(
        (py_iterations_per_frame) => {
            throwIfNoExecutingThread("push_loop_iterations_per_frame");
            const thread = Sk.pytch.executing_thread;
            thread.push_loop_iterations_per_frame(py_iterations_per_frame.v);
        },
        `Push a new loop-control state onto the stack`,
    );

    mod.pop_loop_iterations_per_frame = skulpt_function(
        () => {
            throwIfNoExecutingThread("pop_loop_iterations_per_frame");
            const thread = Sk.pytch.executing_thread;
            thread.pop_loop_iterations_per_frame();
        },
        `Pop a loop-control state from the stack`,
    );

    const broadcast_maybe_wait = (py_message, wait) => {
        let message = Sk.ffi.remapToJs(py_message);
        return new_pytch_suspension("broadcast", {message, wait});
    };

    mod.broadcast = skulpt_function(
        (py_message) => {
            throwIfNoExecutingThread("broadcast");
            return broadcast_maybe_wait(py_message, false);
        },
        `(MESSAGE) Broadcast MESSAGE; continue executing`,
    );

    mod.broadcast_and_wait = skulpt_function(
        (py_message) => {
            throwIfNoExecutingThread("broadcast_and_wait");
            return broadcast_maybe_wait(py_message, true);
        },
        `(MESSAGE) Broadcast MESSAGE; pause until all listeners finish`,
    );

    mod.play_sound = skulpt_function(
        (py_obj, py_sound_locator, py_wait) => {
            // Slight abuse of the "maybe_user_function_name" arg:
            throwIfNoExecutingThread(
                "play_sound",
                "start_sound() or play_sound_until_done"
            );

            if (
                !Sk.builtin.checkString(py_sound_locator)
                && !Sk.builtin.checkNumber(py_sound_locator)
            )
                throw new Sk.builtin.TypeError(
                    "play_sound() must be given a string or number");

            let sound_locator = py_sound_locator.v;

            let wait = Sk.ffi.remapToJs(py_wait);
            return new_pytch_suspension("play-sound", {py_obj, sound_locator, wait});
        },
        `(SOUND) Play a sound from an object; maybe wait`,
    );

    mod._get_actor_sound_mix_bus_gain = skulpt_function(
        (py_obj) => {
            const mix_bus_name = py_obj.$pytchActorInstance.info_label;
            const gain = Sk.pytch.sound_manager.get_mix_bus_gain(mix_bus_name);
            return new Sk.builtin.float_(gain);
        },
        `(ACTOR) Get the gain of the mix-bus associated with the Actor`,
    );

    mod._set_actor_sound_mix_bus_gain = skulpt_function(
        (py_obj, py_gain) => {
            if (!Sk.builtin.checkNumber(py_gain))
                throw new Sk.builtin.TypeError(
                    "set_sound_volume() must be given a number");

            const gain = py_gain.v;
            const clamped_gain = gain < 0.0 ? 0.0 : gain > 1.0 ? 1.0 : gain;

            const mix_bus_name = py_obj.$pytchActorInstance.info_label;

            Sk.pytch.sound_manager.set_mix_bus_gain(mix_bus_name, clamped_gain);
        },
        `(ACTOR, GAIN) Set the gain of the mix-bus associated with the Actor`,
    );

    mod.stop_all_sounds = skulpt_function(
        () => {
            Sk.pytch.sound_manager.stop_all_performances();
            return Sk.builtin.none.none$;
        },
        `() Stop all currently-playing sounds`,
    );

    mod.wait_seconds = skulpt_function(
        (py_n_seconds) => {
            throwIfNoExecutingThread("wait_seconds");
            if (!Sk.builtin.checkNumber(py_n_seconds))
                throw new Sk.builtin.TypeError(
                    "wait_seconds() must be given a number");

            let n_seconds = py_n_seconds.v;
            return new_pytch_suspension("wait-seconds", {n_seconds});
        },
        `(SECONDS) Pause for the given number of seconds`,
    );

    mod._effective_source_object = skulpt_function(
        (py_cls_or_obj) => {
            if (Sk.builtin.checkClass(py_cls_or_obj)) {
                const actor = py_cls_or_obj.$pytchActor
                if (
                    actor == null
                    || actor.class_kind_name !== "Sprite"
                ) {
                    throw new Sk.builtin.ValueError(
                        "in create_clone_of(cls), cls must be"
                            + " a Pytch-registered Sprite class");
                }

                return actor.instances[0].py_object;
            } else {
                const instance = py_cls_or_obj.$pytchActorInstance;
                if (
                    instance == null
                    || instance.actor == null
                    || instance.actor.class_kind_name !== "Sprite"
                ) {
                    throw new Sk.builtin.ValueError(
                        "in create_clone_of(obj), obj must be"
                            + " an instance of"
                            + " a Pytch-registered Sprite class");
                }

                return py_cls_or_obj;
            }
        },
        "Effective instance of registered Sprite-derived class to clone",
    );

    // TODO: Allow None as py_parent_instance, to register an instance
    // which was not created by Pytch's clone mechanism?
    mod.register_sprite_instance = skulpt_function(
        (py_instance, py_parent_instance) => {
            throwIfNoExecutingThread(
                "register_sprite_instance",
                "create_clone_of"
            );
            return new_pytch_suspension("register-instance",
                                        {py_instance, py_parent_instance});
        },
        `Register a sprite instance`,
    );

    mod.unregister_running_instance = skulpt_function(
        () => {
            throwIfNoExecutingThread(
                "unregister_running_instance",
                "delete_this_clone"
            );
            return new_pytch_suspension("unregister-running-instance");
        },
        `Unregister a sprite instance`,
    );

    mod.registered_instances = skulpt_function(
        (py_class) => {
            if (!Sk.builtin.checkClass(py_class))
                throw new Sk.builtin.TypeError(
                    "registered_instances(): must be called with class"
                );

            let actor = py_class.$pytchActor;
            if (actor == null)
                throw new Sk.builtin.ValueError(
                    "registered_instances(): class not registered with Pytch"
                );

            let py_instances = actor.instances.map(instance => instance.py_object);
            return new Sk.builtin.list(py_instances);
        },
        `Return a list of all instances of the given class`,
    );

    mod.key_pressed = skulpt_function(
        (py_keyname) => {
            assertPyKeynameValid(py_keyname)
            let js_keyname = py_keyname.v;
            return (Sk.pytch.keyboard.key_is_pressed(js_keyname)
                    ? Sk.builtin.bool.true$
                    : Sk.builtin.bool.false$);
        },
        `(KEY) Return whether KEY is currently pressed down`,
    );

    mod.ask_and_wait = skulpt_function(
        (py_prompt) => {
            throwIfNoExecutingThread("ask_and_wait");

            const prompt = Sk.ffi.remapToJs(py_prompt);
            const prompt_is_not_None = (py_prompt !== Sk.builtin.none.none$);
            if ((typeof prompt !== "string") && prompt_is_not_None)
                throw new Sk.builtin.TypeError(
                    "ask_and_wait(): question must be a string or None");

            return new_pytch_suspension("ask-and-wait-for-answer", { prompt });
        },
        `(QUESTION) Ask question; wait for and return user's answer`,
    );

    mod._show_object_attribute = skulpt_function(
        (py_object, py_attribute_name, py_label, py_position) => {
            throwIfNoExecutingThread("_show_object_attribute", "show_variable");

            if (! Sk.builtin.checkString(py_attribute_name))
                throw new Sk.builtin.TypeError(
                    "_show_object_attribute(): attribute name must be string");

            if (! Sk.builtin.checkString(py_label))
                throw new Sk.builtin.TypeError(
                    "_show_object_attribute(): label must be string");

            const label = Sk.ffi.remapToJs(py_label);

            if (! (py_position instanceof Sk.builtin.tuple))
                throw new Sk.builtin.TypeError(
                    "_show_object_attribute(): position must be tuple");

            const position = Sk.ffi.remapToJs(py_position);

            if (position.length !== 4)
                throw new Sk.builtin.ValueError(
                    "_show_object_attribute(): position must have 4 elements");

            if (! position.every((x) => (x === null || typeof x === "number")))
                throw new Sk.builtin.TypeError(
                    "_show_object_attribute(): all elements of position"
                    + " must be number or null");

            if (position[0] !== null && position[2] !== null)
                throw new Sk.builtin.ValueError(
                    "_show_object_attribute(): cannot give"
                    + ` both "top" and "bottom" args`);

            if (position[1] !== null && position[3] !== null)
                throw new Sk.builtin.ValueError(
                    "_show_object_attribute(): cannot give"
                    + ` both "left" and "right" args`);

            return new_pytch_suspension(
                "show-object-attribute",
                { py_object, py_attribute_name, label, position },
            );
        },
        `Add a watcher for an object attribute`,
    );

    mod._hide_object_attribute = skulpt_function(
        (py_object, py_attribute_name) => {
            throwIfNoExecutingThread("_hide_object_attribute", "hide_variable");

            if (! Sk.builtin.checkString(py_attribute_name))
                throw new Sk.builtin.TypeError(
                    "_hide_object_attribute(): attribute name must be string");

            return new_pytch_suspension(
                "hide-object-attribute",
                { py_object, py_attribute_name },
            );
        },
        `Remove a watcher for an object attribute`,
    );

    mod.stop_all = skulpt_function(
        () => new_pytch_suspension("stop-all-threads", {}),
        `() Stop all currently-running scripts`,
    );

    return mod;
};
