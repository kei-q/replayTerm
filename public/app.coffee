gTerm = null

$(document).ready ->
  gTerm = new cli(document)
  gTerm.update 'test'
