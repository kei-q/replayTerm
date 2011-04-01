gTerm = null

play = (json) ->
  playAUX json, json[0].time, 0

playAUX = (json, pt, idx) ->
  if json[idx]
    gTerm.update json[idx].contents
    setTimeout (-> playAUX json, json[idx].time, (idx+1)), ((json[idx].time - pt)*1000)

$(document).ready ->
  gTerm = new cli(document)
  $.getJSON ('/rec/' + $('#record').text() + '.json'),  (json) ->
    play json
