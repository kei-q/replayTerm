var gTerm;
gTerm = null;
$(document).ready(function() {
  gTerm = new cli(document);
  return gTerm.update('test');
});