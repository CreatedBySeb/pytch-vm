"use strict";

const {
    configure_mocha,
    assert,
    import_deindented,
    one_frame,
    pytch_stdout,
} = require("./pytch-testing.js");
configure_mocha();


////////////////////////////////////////////////////////////////////////////////
//
// Position querying via properties

describe("Position properties", () => {
    it("can retrieve coords", async () => {
        const project = await import_deindented(`

            import pytch
            class Banana(pytch.Sprite):
                Costumes = ["yellow-banana.png"]
                @pytch.when_I_receive("move")
                def move_around(self):
                    self.go_to_xy(10, 20)
                    print(f"{self.x_position} {self.y_position}")
                    self.set_x(100)
                    print(f"{self.x_position} {self.y_position}")
                    self.set_y(-40)
                    print(f"{self.x_position} {self.y_position}")
                    self.change_x(10)
                    print(f"{self.x_position} {self.y_position}")
                    self.change_y(-30)
                    print(f"{self.x_position} {self.y_position}")
        `);

        project.do_synthetic_broadcast("move");
        one_frame(project);

        const exp_output = [
            "10 20\n",
            "100 20\n",
            "100 -40\n",
            "110 -40\n",
            "110 -70\n"
        ].join("")

        assert.equal(pytch_stdout.drain_stdout(), exp_output);
    });
});
