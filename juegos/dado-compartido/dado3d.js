var DICE_ROTATIONS = {
    1: [0, 0],
    2: [-90, 0],
    3: [0, -90],
    4: [0, 90],
    5: [90, 0],
    6: [180, 0]
};

function rollDice(id, result) {
    var dice = document.getElementById(id);
    if (!dice) return;

    dice.style.transition = 'none';
    dice.style.transform = 'rotateX(0deg) rotateY(0deg)';
    void dice.offsetWidth;

    var r = DICE_ROTATIONS[result];
    var extraX = (Math.floor(Math.random() * 4) + 3) * 360;
    var extraY = (Math.floor(Math.random() * 4) + 3) * 360;

    setTimeout(function() {
        dice.style.transition = 'transform 1.2s cubic-bezier(0.1, 0.7, 0.1, 1)';
        dice.style.transform = 'rotateX(' + (r[0] + extraX) + 'deg) rotateY(' + (r[1] + extraY) + 'deg)';

        setTimeout(function() {
            dice.style.transition = 'transform 0.3s ease-out';
            dice.style.transform = 'rotateX(' + r[0] + 'deg) rotateY(' + r[1] + 'deg)';
        }, 1200);
    }, 20);
}
