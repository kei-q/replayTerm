var gTerm, play, playAUX;
gTerm = null;
play = function(json) {
  return playAUX(json, json[0].time, 0);
};
playAUX = function(json, pt, idx) {
  if (json[idx]) {
    gTerm.update(json[idx].contents);
    return setTimeout((function() {
      return playAUX(json, json[idx].time, idx + 1);
    }), (json[idx].time - pt) * 1000 / 2);
  }
};
$(document).ready(function() {
  gTerm = new cli(document);
  return $.getJSON('/rec/' + $('#record').text() + '.json', function(json) {
    return play(json);
  });
});