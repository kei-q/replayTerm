/*
  TermEmulator - Emulator for VT100 terminal programs
  Copyright (C) 2008 Siva Chandran P

  This library is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation; either
  version 2 of the License, or (at your option) any later version.

  This library is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this library; if not, write to the Free
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

  Contributor(s):
  Siva Chandran P <siva.chandran.p@gmail.com>    (original author)

  Mime Cuvalo     <mimecuvalo@gmail.com>

*/

debug = console.log;

function cloneObject(what) {
  var result = new Object();
  for (var i in what) {
    result[i] = what[i];
  }
  return result;
}

/*
  Initializes the terminal with specified rows and columns. User can
  resize the terminal any time using Resize method. By default the screen
  is cleared(filled with blank spaces) and cursor positioned in the first
  row and first column.
*/
var cli = function(doc) {
  this.doc      = doc;
  this.body     = doc.getElementById('display');
  this.history  = doc.getElementById('history');
  this.historyOuter  = doc.getElementById('history-outer');
  this.terminal = doc.getElementById('terminal');
  this.cursor   = doc.getElementById('cursor');
  this.letterHeight = this.cursor.clientHeight;
  this.letterWidth = this.cursor.clientWidth;

  /*
  cmdlog.wcontentWindow.addEventListener('scroll', this.updateHistoryView.bind(this), false);
  this.doc.addEventListener('keydown', this.keyDown.bind(this), false);
  this.doc.addEventListener('keypress', this.keyPress.bind(this), false);
  this.doc.addEventListener('focus', this.onFocus.bind(this), false);
  this.doc.addEventListener('blur', this.onBlur.bind(this), false);
  */

  this.onResize(true);

  this.curX = 0;
  this.curY = 0;
  this.ignoreChars = false;

  // special character handlers
  this.charHandlers = {};
  this.charHandlers[this.__ASCII_NUL]  = this.__OnCharIgnore.bind(this);
  this.charHandlers[this.__ASCII_BEL]  = this.__OnCharBel.bind(this);
  this.charHandlers[this.__ASCII_BS]   = this.__OnCharBS.bind(this);
  this.charHandlers[this.__ASCII_HT]   = this.__OnCharHT.bind(this);
  this.charHandlers[this.__ASCII_LF]   = this.__OnCharLF.bind(this);
  this.charHandlers[this.__ASCII_VT]   = this.__OnCharLF.bind(this);
  this.charHandlers[this.__ASCII_FF]   = this.__OnCharLF.bind(this);
  this.charHandlers[this.__ASCII_CR]   = this.__OnCharCR.bind(this);
  this.charHandlers[this.__ASCII_XON]  = this.__OnCharXON.bind(this);
  this.charHandlers[this.__ASCII_XOFF] = this.__OnCharXOFF.bind(this);
  this.charHandlers[this.__ASCII_ESC]  = this.__OnCharESC.bind(this);
  this.charHandlers[this.__ASCII_CSI]  = this.__OnCharCSI.bind(this);

  // escape sequence handlers
  this.escSeqHandlers = {};
  this.escSeqHandlers[this.__ESCSEQ_ICH] = this.__OnEscSeqICH.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_CUU] = this.__OnEscSeqCUU.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_CUD] = this.__OnEscSeqCUD.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_CUF] = this.__OnEscSeqCUF.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_CUB] = this.__OnEscSeqCUB.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_CHA] = this.__OnEscSeqCHA.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_CUP] = this.__OnEscSeqCUP.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_ED]  = this.__OnEscSeqED.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_EL]  = this.__OnEscSeqEL.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_IL]  = this.__OnEscSeqIL.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_DL]  = this.__OnEscSeqDL.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_DCH]  = this.__OnEscSeqDCH.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_SU]  = this.__OnEscSeqSU.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_SD]  = this.__OnEscSeqSD.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_VPA] = this.__OnEscSeqVPA.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_DECSET] = this.__OnEscSeqDECSET.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_DECRST] = this.__OnEscSeqDECRST.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_SGR] = this.__OnEscSeqSGR.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_DECSTBM] = this.__OnEscSeqDECSTBM.bind(this);
  this.escSeqHandlers[this.__ESCSEQ_DECWINMAN] = this.__OnEscSeqDECWINMAN.bind(this);

  this.escParenSeqHandlers = {};
  this.escParenSeqHandlers[this.__ESCPARENSEQ_usg0] = this.__OnEscParenSeqUsg0.bind(this);
  this.escParenSeqHandlers[this.__ESCPARENSEQ_specg0] = this.__OnEscParenSeqSpecg0.bind(this);

  // defines the printable characters, only these characters are printed
  // on the terminal
  this.printableChars = "0123456789";
  this.printableChars += "abcdefghijklmnopqrstuvwxyz";
  this.printableChars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  this.printableChars += "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ ";
  this.printableChars += "\t";

  // terminal screen, its a list of string in which each string always
  // holds self.cols characters. If the screen doesn't contain any
  // characters then it'll be blank spaces
  this.screen = [];

  this.scrRendition = [];

  // current rendition
  this.curRendition = this.resetStyle;

  // list of dirty lines since last call to GetDirtyLines
  this.isLineDirty = [];

  this.blank = { c: '&nbsp;', style: this.resetStyle };

  for (var i = 0; i < this.rows; ++i) {
    var line = [];

    for (var j = 0; j < this.cols; ++j) {
      line.push(new cloneObject(this.blank));
    }

    this.screen.push(line);
    this.scrRendition.push("");
    this.isLineDirty.push(false);
  }

  this.onTerminalReset(true);

  // unparsed part of last input
  this.unparsedInput = null;

}

cli.prototype = {
  __ASCII_NUL   : 0,    // Null
  __ASCII_BEL   : 7,    // Bell
  __ASCII_BS    : 8,    // Backspace
  __ASCII_HT    : 9,    // Horizontal Tab
  __ASCII_LF    : 10,   // Line Feed
  __ASCII_VT    : 11,   // Vertical Tab
  __ASCII_FF    : 12,   // Form Feed
  __ASCII_CR    : 13,   // Carriage Return
  __ASCII_XON   : 17,   // Resume Transmission
  __ASCII_XOFF  : 19,   // Stop Transmission or Ignore Characters
  __ASCII_ESC   : 27,   // Escape
  __ASCII_SPACE : 32,   // Space
  __ASCII_CSI   : 153,  // Control Sequence Introducer

  __ESCSEQ_ICH  : '@',  // n @: Insert blanks n(default 1) times.
  __ESCSEQ_CUU  : 'A',  // n A: Moves the cursor up n(default 1) times.
  __ESCSEQ_CUD  : 'B',  // n B: Moves the cursor down n(default 1) times.
  __ESCSEQ_CUF  : 'C',  // n C: Moves the cursor forward n(default 1) times.
  __ESCSEQ_CUB  : 'D',  // n D: Moves the cursor backward n(default 1) times.

  __ESCSEQ_CHA  : 'G',  // n G: Cursor horizontal absolute position. 'n' denotes
                        // the column no(1 based index). Should retain the line
                        // position.

  __ESCSEQ_CUP  : 'H',  // n ; m H: Moves the cursor to row n, column m.
                        // The values are 1-based, and default to 1 (top left
                        // corner).

  __ESCSEQ_ED   : 'J',  // n J: Clears part of the screen. If n is zero
                        // (or missing), clear from cursor to end of screen.
                        // If n is one, clear from cursor to beginning of the
                        // screen. If n is two, clear entire screen.

  __ESCSEQ_EL   : 'K',  // n K: Erases part of the line. If n is zero
                        // (or missing), clear from cursor to the end of the
                        // line. If n is one, clear from cursor to beginning of
                        // the line. If n is two, clear entire line. Cursor
                        // position does not change.

  __ESCSEQ_IL   : 'L',  // n L: Insert n lines. default 1

  __ESCSEQ_DL   : 'M',  // n M: Delete n lines. default 1

  __ESCSEQ_DCH  : 'P',  // n P: Delete n characters. default 1

  __ESCSEQ_SU  : 'S',  // n S: Scroll up P s lines (default = 1) (SU).

  __ESCSEQ_SD  : 'T',  // n T: Scroll down P s lines (default = 1) (SD).

  __ESCSEQ_VPA  : 'd',  // n d: Cursor vertical absolute position. 'n' denotes
                        // the line no(1 based index). Should retain the column
                        // position.

  __ESCSEQ_DECSET  : 'h',  // ? n [;a;b;c...] h: DEC Private Mode Set
                           // n [;a;b;c...] h: Set Mode

  __ESCSEQ_DECRST  : 'l',  // ? n [;a;b;c...] l: DEC Private Mode Reset
                           // n [;a;b;c...] l: Reset Mode

  __ESCSEQ_SGR  : 'm',  // n [;k] m: Sets SGR (Select Graphic Rendition)
                        // parameters. After CSI can be zero or more parameters
                        // separated with ;. With no parameters, CSI m is treated
                        // as CSI 0 m (reset / normal), which is typical of most
                        // of the ANSI codes.

  __ESCSEQ_DECSTBM  : 'r',  // n [;k] r: Sets Scrolling region

  __ESCSEQ_DECWINMAN  : 't',  // n;n;n t: Window manipulation

  __ESCPARENSEQ_usg0  : 'B',  // Set United States G0 character set

  __ESCPARENSEQ_specg0  : '0',  // Set G0 special chars. & line set

  specialKeyMap : {
    9 :  '\x09',   // tab
    27:  '\x1b',   // escape
    35:  '\x05',   // end
    36:  '\x01',   // home
    37:  '\x1bOD', // left
    38:  '\x1bOA', // up
    39:  '\x1bOC', // right
    40:  '\x1bOB', // down
    46:  '\x1b[3~', // delete
    112: '\x1bOP', // F1
    113: '\x1bOQ', // F2
    114: '\x1bOR', // F3
    115: '\x1bOS', // F4
    116: '\x1b[15~', // F5
    117: '\x1b[17~', // F6
    118: '\x1b[18~', // F7
    119: '\x1b[19~', // F8
    120: '\x1b[20~', // F9
    121: '\x1b[21~', // F10
    122: '\x1b[23~', // F11
    123: '\x1b[24~', // F12
  },

  doc : null,
  body : null,
  history : null,
  historyOuter : null,
  terminal : null,
  cursor : null,

  letterHeight : 14,
  letterWidth : 7,
  defaultColor : '#33ff33',
  defaultBGColor : 'black',
  font : "Andale Mono",
  fontSize : "12",

  scrollingRegion : null,
  insertMode : false,

  graphicsCharactersMode : false,
  graphicsCharacters : {
    '_' : ' ',
    '`' : '♦',
    'a' : '░',
    'b' : '\t',
    'c' : '\x0c',
    'd' : '\x0d',
    'e' : '\x0a',
    'f' : '°',
    'g' : '±',
    'h' : '\x0a',
    'i' : '\x0b',
    'j' : '┘',
    'k' : '┐',
    'l' : '┌',
    'm' : '└',
    'n' : '┼',
    'o' : '⎺',
    'p' : '⎻',
    'q' : '─',
    'r' : '⎼',
    's' : '⎽',
    't' : '├',
    'u' : '┤',
    'v' : '┴',
    'w' : '┬',
    'x' : '│',
    'y' : '≤',
    'z' : '≥',
    '{' : 'π',
    '|' : '≠',
    '}' : '£',
    '~' : '∙',
  },

  origScreen : null,
  origScrRendition : null,

  isFocused : false,
  initialScroll : false,
  historyCache : [],
  newHistoryLines : 0,
  historyStart : -1,
  refresh : false,

  negativeColors : false,

  resetStyle : {
    noStyle : true,
    backgroundColor : '',
    color : '',
    fontStyle : '',
    fontWeight : '',
    opacity : '',
    textDecoration : '',
    visibility : ''
  },

  styleNames : {
    backgroundColor : 'background-color',
    color : 'color',
    fontStyle : 'font-style',
    fontWeight : 'font-weight',
    opacity : 'opacity',
    textDecoration : 'text-decoration',
    visibility : 'visibility'
  },
// {{{ unused
  keyDown : function(event) {
    //event.preventDefault();

  },

  keyPress : function(event) {
    //console.log(event.which + ' '+event.keyCode);
    if (testAccelKey(event)) {
      // cmd-a : select all, don't preventDefault on Macs only
      // cmd-x, cmd-c [cut, copy] : don't preventDefault
      if ((event.metaKey && event.which == 97) || event.which == 120 || event.which == 99) {
        return;
      }
      if (event.which == 116) { // cmd-t, new tab
        return;
      }
    }

    event.preventDefault();

    if (testAccelKey(event)) {
      if (event.which == 118) {         // cmd-v, paste
        this.paste();
        return;
      } else if (event.which == 119) {  // cmd-w, close tab
        window.close();
        return;
      }
    }

    if (event.ctrlKey) {
      if (event.which == 64) {   // ctrl-@
        gConnection.output('\0');
      } else if (event.which >= 97 && event.which <= 122) { // ctrl-[a-z]
        gConnection.output(String.fromCharCode(event.which - 96));
      } else if (event.which == 27) { // ctrl-?
        gConnection.output('\x7f');
      } else {
        gConnection.output(String.fromCharCode(event.which));
      }
      return;
    }

    var character;
    if (event.which) {
      character = String.fromCharCode(event.which);
    } else {
      character = this.specialKeyMap[event.keyCode];
      if (!character) {
        return;
      }
    }
    gConnection.output(character);
  },

  paste : function() {
    var clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
    if (!clip) return false;

    var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
    if (!trans) return false;
    trans.addDataFlavor("text/unicode");

    clip.getData(trans, clip.kGlobalClipboard);

    var str       = new Object();
    var strLength = new Object();

    trans.getTransferData("text/unicode", str, strLength);
    if (str) {
      str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
      pastetext = str.data.substring(0, strLength.value / 2);
      gConnection.output(pastetext);
    }
  },
// }}}

  update : function(message) {
    //console.log(message.toSource());
    var scrollLog = this.body.scrollTop + 50 >= this.body.scrollHeight - this.body.clientHeight;

    try {
      this.ProcessInput(message);
      this.updateScreen(scrollLog);
    } catch (ex) {
      debug('cursor: ' + this.curY + ' ' + this.curX);
      debug(ex);
    }
  },

  updateScreen : function(scrollLog, dontScrollIfNotInitialized) {
    this.updateHistoryView();

    for (var i = 0; i < this.rows; ++i) {
      if (this.isLineDirty[i] || this.refresh) {
        this.isLineDirty[i] = false;
        this.scrRendition[i] = this.createScreenRendition(i);
        this.terminal.childNodes[i].innerHTML = this.scrRendition[i];
      }
    }
    this.refresh = false;

    if (!dontScrollIfNotInitialized || this.initialScroll) {
      if (scrollLog || !this.initialScroll) {
        this.initialScroll = true;
        this.body.scrollTop = this.body.scrollHeight - this.body.clientHeight;  // scroll to bottom
      }
    }

    this.updateCursor();
  },

  updateCursor : function() {
    // update cursor position
    var x = this.curX < this.cols ? this.curX : this.cols - 1;
    this.cursor.innerHTML = this.screen[this.curY][x].c;
    this.cursor.style.color = this.screen[this.curY][x].style.color;
    this.cursor.style.backgroundColor = this.defaultColor;
    this.cursor.style.top = (this.curY * this.letterHeight + this.terminal.offsetTop) + 'px';
    this.cursor.style.left = (x * this.letterWidth + this.terminal.offsetLeft) + 'px';
  },

  transformStyle : function(style) {
    var css = "";
    for (var s in style) {
      if (s != 'noStyle' && style[s]) {
        css += this.styleNames[s] + ":" + style[s] + ";";
      }
    }
    return css;
  },

  createScreenRendition : function(row, screen) {
    var rendition = '';
    screen = screen || this.screen;

    var styling = false;
    var currentStyle = null;
    for (var x = 0; x < this.cols; ++x) {
      if (screen[row][x].style.noStyle) {
        if (styling) {
          rendition += '</span>';
          styling = false;
        }
        rendition += screen[row][x].c;
      } else {
        if (styling && currentStyle != screen[row][x].style) {
          rendition += '</span><span style="' + this.transformStyle(screen[row][x].style) + '">';
          currentStyle = screen[row][x].style;
        } else if (!styling) {
          rendition += '<span style="' + this.transformStyle(screen[row][x].style) + '">';
          currentStyle = screen[row][x].style;
        }
        styling = true;
        rendition += screen[row][x].c;
      }
    }

    if (styling) {
      rendition += '</span>';
    }

    rendition += '';
    return rendition;
  },

  onTerminalReset : function(init) {
    var oneLine = '<div>' + new Array(this.cols + 1).join('&nbsp;') + '</div>';
    this.history.innerHTML = new Array(this.rows + 2).join(oneLine);
    this.terminal.innerHTML = new Array(this.rows + 1).join(oneLine);

    if (!init) {
      this.body.scrollTop = this.body.scrollHeight - this.body.clientHeight;  // scroll to bottom
    }
  },

  addHistory : function(message) {
    if (!message) {
      return;
    }

    this.historyCache.push(message);
    ++this.newHistoryLines;
  },

  updateHistoryView : function(force) {
    var scrollLog = this.body.scrollTop + 50 >= this.body.scrollHeight - this.body.clientHeight;

    this.historyOuter.style.height = (this.historyOuter.clientHeight + this.newHistoryLines * this.letterHeight) + 'px';
    this.newHistoryLines = 0;

    var positionTop = this.body.scrollTop - this.historyOuter.offsetTop;
    var maxBottom = this.historyOuter.clientHeight + this.historyOuter.offsetTop;
    var firstLine;
    if (positionTop < 0) {
      firstLine = 0;
    } else {
      firstLine = (positionTop + this.history.clientHeight < maxBottom
                    ? positionTop
                    : this.historyOuter.clientHeight + this.historyOuter.offsetTop - this.history.clientHeight);
    }
    firstLine = parseInt(firstLine / this.letterHeight);
    this.history.style.top = (firstLine * this.letterHeight) + 'px';

    if (firstLine != this.historyStart || force) {
      for (var i = 0; i < this.rows + 1 && i + firstLine < this.historyCache.length; ++i) {
        this.history.childNodes[i].innerHTML = this.historyCache[i + firstLine];
      }
    }
    this.historyStart = firstLine;

    if (typeof force == "boolean" && force) {
      if (scrollLog && this.initialScroll) {
        this.initialScroll = true;
        this.body.scrollTop = this.body.scrollHeight - this.body.clientHeight;  // scroll to bottom
      }
      this.updateCursor();
    }
  },

  /*
    Returns the screen as a list of strings. The list will have rows no. of
    strings and each string will have columns no. of characters. Blank space
    used represents no character.
  */
  GetRawScreen : function() {
    return this.screen;
  },

  /*
    Returns the screen as a list of array of long. The list will have rows
    no. of array and each array will have columns no. of longs. The first
    8 bits of long represents rendition style like bold, italics and etc.
    The next 4 bits represents foreground color and next 4 bits for
    background color.
  */
  GetRawScreenRendition : function() {
    return this.scrRendition;
  },

  /*
    Returns no. rows in the terminal
  */
  GetRows : function() {
    return this.rows;
  },

  /*
    Returns no. cols in the terminal
  */
  GetCols : function() {
    return this.cols;
  },

  /*
    Returns terminal rows and cols as tuple
  */
  GetSize : function() {
    return [this.rows, this.cols];
  },

  /*
    Resizes the terminal to specified rows and cols.
    - If the new no. rows is less than existing no. rows then existing rows
      are deleted at top.
    - If the new no. rows is greater than existing no. rows then
      blank rows are added at bottom.
    - If the new no. cols is less than existing no. cols then existing cols
      are deleted at right.
    - If the new no. cols is greater than existing no. cols then new cols
      are added at right.
  */
  Resize : function(rows, cols) {
    if (rows < this.rows) {
      // remove rows at top
      for (var i = 0; i < this.rows - rows; ++i) {
        this.isLineDirty.shift();
        var rendition = this.scrRendition.shift();
        if (this.origScreen) {
          rendition = this.origScrRendition.shift();
        }

        if (!rendition) {
          var screen = this.origScreen ? this.origScreen : this.screen;
          rendition = this.createScreenRendition(0, screen);
        }
        this.addHistory(rendition);

        this.screen.shift();
        if (this.origScreen) {
          this.origScreen.shift();
        }
      }
    } else if (rows > this.rows) {
      // add blank rows at bottom
      for (var i = 0; i < rows - this.rows; ++i) {
        var line = [];

        for (var j = 0; j < this.cols; ++j) {
          line.push(new cloneObject(this.blank));
        }

        this.screen.push(line);
        this.scrRendition.push("");
        this.isLineDirty.push(false);

        if (this.origScreen) {
          var line = [];

          for (var j = 0; j < this.cols; ++j) {
            line.push(new cloneObject(this.blank));
          }

          this.origScreen.push(line);
          this.origScrRendition.push("");
        }
      }
    }

    if (this.curY >= rows) {
      this.curY = rows - 1;
    }

    if (cols < this.cols) {
      // remove cols at right
      for (var i = 0; i < rows; ++i) {
        this.screen[i] = this.screen[i].slice(0, cols - this.cols);
        if (this.origScreen) {
          this.origScreen[i] = this.origScreen[i].slice(0, cols - this.cols);
        }
      }
    } else if (cols > this.cols) {
      // add cols at right
      for (var i = 0; i < rows; ++i) {
        for (var j = 0; j < cols - this.cols; ++j) {
          this.screen[i].push(new cloneObject(this.blank));
          if (this.origScreen) {
            this.origScreen[i].push(new cloneObject(this.blank));
          }
        }
      }
    }

    if (this.curX >= cols) {
      this.curX = cols - 1;
    }

    this.rows = rows;
    this.cols = cols;
    this.refresh = true;

    this.onTerminalReset();
    this.updateScreen(true, true);
  },

  /*
    Returns cursor position as tuple
  */
  GetCursorPos : function() {
    return [this.curY, this.curX];
  },

  /*
    Clears the entire terminal screen
  */
  Clear : function() {
    this.ClearRect(0, 0, this.rows - 1, this.cols - 1);
  },

  /*
    Clears the terminal screen starting from startRow and startCol to
    endRow and EndCol.
  */
  ClearRect : function(startRow, startCol, endRow, endCol) {
    if (startRow < 0) {
      startRow = 0;
    } else if (startRow >= this.rows) {
      startRow = this.rows - 1;
    }

    if (startCol < 0) {
      startCol = 0;
    } else if (startCol >= this.cols) {
      startCol = this.cols - 1;
    }

    if (endRow < 0) {
      endRow = 0;
    } else if (endRow >= this.rows) {
      endRow = this.rows - 1;
    }

    if (endCol < 0) {
      endCol = 0;
    } else if (endCol >= this.cols) {
      endCol = this.cols - 1;
    }

    if (startRow > endRow) {
      var temp = startRow;
      startRow = endRow;
      endRow = temp;
    }

    if (startCol > endCol) {
      var temp = startCol;
      startCol = endCol;
      endCol = startCol;
    }

    for (var i = startRow; i < endRow + 1; ++i) {
      var start = 0;
      var end = this.cols - 1;

      if (i == startRow) {
        start = startCol;
      } else if (i == endRow) {
        end = endCol;
      }

      for (var j = start; j < end + 1; ++j) {
        this.screen[i][j].c = '&nbsp;';
        this.screen[i][j].style = this.curRendition.noStyle ? this.resetStyle : this.curRendition;
      }

      if (end + 1 > start) {
        this.isLineDirty[i] = true;
      }
    }
  },

  /*
    Returns the character at the location specified by row and col. The
    row and col should be in the range 0..rows - 1 and 0..cols - 1."
  */
  GetChar : function(row, col) {
    if (row < 0 || row >= this.rows) {
      return null;
    }

    if (cols < 0 || col >= this.cols) {
      return null;
    }

    return this.screen[row][col];
  },

  /*
    Returns the terminal screen line specified by lineno. The line is
    returned as string, blank space represents empty character. The lineno
    should be in the range 0..rows - 1
  */
  GetLine : function(lineno) {
    if (lineno < 0 || lineno >= this.rows) {
      return null;
    }

    return this.screen[lineno].toString();  // todo
  },

  /*
    Returns terminal screen lines as a list, same as GetScreen
  */
  GetLines : function() {
    var lines = [];

    for (var i = 0; i < this.rows; ++i) {
      lines.push(this.screen[i].toString());  // todo
    }

    return lines;
  },

  /*
    Returns the entire terminal screen as a single big string. Each row
    is seperated by \\n and blank space represents empty character.
  */
  GetLinesAsText : function() {
    var text = "";

    for (var i = 0; i < this.rows; ++i) {
      text += this.screen[i].toString();  // todo
      text += '\n';
    }

    text = text.replace(/\n+$/g, ''); // removes leading new lines

    return text;
  },

  /*
    Returns list of dirty lines(line nos) since last call to GetDirtyLines.
    The line no will be 0..rows - 1.
  */
  GetDirtyLines : function() {
    var dirtyLines = [];

    for (var i = 0; i < this.rows; ++i) {
      if (this.isLineDirty[i]) {
        dirtyLines.push(i);
        this.isLineDirty[i] = false;
      }
    }

    return dirtyLines;
  },

  /*
    Processes the given input text. It detects V100 escape sequences and
    handles it. Any partial unparsed escape sequences are stored internally
    and processed along with next input text. Before leaving, the function
    calls the callbacks CALLBACK_UPDATE_LINE and CALLBACK_UPDATE_CURSOR_POS
    to update the changed lines and cursor position respectively.
  */
  ProcessInput : function(text) {
    if (!text) {
      return;
    }

    if (this.unparsedInput) {
      text = this.unparsedInput + text;
      this.unparsedInput = null;
    }

    var textlen = text.length;
    var index = 0;
    while (index < textlen) {
      var ch = text[index];
      var graphicsChar = false;

      if (this.graphicsCharactersMode && this.graphicsCharacters[ch]) {
        ch = this.graphicsCharacters[ch];
        graphicsChar = true;
      }

      var ascii = ch.charCodeAt(0);

      if (this.ignoreChars) {
        index += 1;
        continue;
      }

      if (this.charHandlers[ascii]) {
        index = this.charHandlers[ascii](text, index);
      } else {
        if (graphicsChar || this.printableChars.indexOf(ch) != -1) {
          this.__PushChar(ch);
        }
        //else:
        //  print "WARNING: Unsupported character %s:%d" % (ch, ascii)
        index += 1;
      }
    }

    // update the dirty lines
    //if (this.callbacks[this.CALLBACK_UPDATE_LINES]) {
    //  this.callbacks[this.CALLBACK_UPDATE_LINES]();
    //}
  },

  /*
    Scrolls up the terminal screen by one line. The callbacks
    CALLBACK_UPDATE_LINES and CALLBACK_SCROLL_UP_SCREEN are called before
    scrolling the screen.
  */
  ScrollUp : function() {
    // update the dirty lines
    //if (this.callbacks[this.CALLBACK_UPDATE_LINES]) {
    //  this.callbacks[this.CALLBACK_UPDATE_LINES]();
    //}

    for (var x = 0; x < this.rows - 1; ++x) {
      this.isLineDirty[x] = this.isLineDirty[x + 1];
    }

    this.cursor.style.backgroundColor = '';

    var rendition;
    if (this.scrollingRegion && this.scrollingRegion[1] < this.rows) {
      rendition = this.scrRendition.splice(this.scrollingRegion[0] - 1, 1);
      this.scrRendition.splice(this.scrollingRegion[1] - 1, 0, "");
    } else {
      rendition = this.scrRendition.shift();
      this.scrRendition.push("");
    }
    var lineNo = this.scrollingRegion ? this.scrollingRegion[0] - 1 : 0;
    if (!rendition || this.isLineDirty[lineNo]) {
      rendition = this.createScreenRendition(lineNo);
    }
    if (!this.origScreen) {
      this.addHistory(rendition);
    }

    var line;
    if (this.scrollingRegion && this.scrollingRegion[1] < this.rows) {
      line = this.screen.splice(this.scrollingRegion[0] - 1, 1);
    } else {
      line = this.screen.shift();
    }
    for (var i = 0; i < this.cols; ++i) {
      line[i] = new cloneObject(this.blank);
    }

    if (this.scrollingRegion && this.scrollingRegion[1] < this.rows) {
      this.screen.splice(this.scrollingRegion[1] - 1, 0, line);
    } else {
      this.screen.push(line);
    }

    this.refresh = true;
  },

  /*
    Scrolls down the terminal screen by one line. The callbacks
    CALLBACK_UPDATE_LINES and CALLBACK_SCROLL_UP_SCREEN are called before
    scrolling the screen.
  */
  ScrollDown : function() {
    // update the dirty lines
    //if (this.callbacks[this.CALLBACK_UPDATE_LINES]) {
    //  this.callbacks[this.CALLBACK_UPDATE_LINES]();
    //}

    this.cursor.style.backgroundColor = '';

    var rendition;
    if (this.scrollingRegion && this.scrollingRegion[1] < this.rows) {
      rendition = this.scrRendition.splice(this.scrollingRegion[1] - 1, 1);
      this.scrRendition.splice(this.scrollingRegion[0] - 1, 0, "");
    } else {
      rendition = this.scrRendition.pop();
      this.scrRendition.unshift("");
    }

    var line;
    if (this.scrollingRegion && this.scrollingRegion[1] < this.rows) {
      line = this.screen.splice(this.scrollingRegion[1] - 1, 1);
    } else {
      line = this.screen.pop();
    }
    for (var i = 0; i < this.cols; ++i) {
      line[i] = new cloneObject(this.blank);
    }
    if (this.scrollingRegion && this.scrollingRegion[1] < this.rows) {
      this.screen.splice(this.scrollingRegion[0] - 1, 0, line);
    } else {
      this.screen.unshift(line);
    }

    this.refresh = true;
  },

  /*
  Dump(self, file=sys.stdout):
    """
    Dumps the entire terminal screen into the given file/stdout
    """
    for i in range(self.rows):
        file.write(self.screen[i].tostring())
        file.write("\n")
  */

  /*
    Moves the cursor to the next line, if the cursor is already at the
    bottom row then scrolls up the screen.
  */
  __NewLine : function() {
    this.curX = 0;

    if (this.curY + 1 < this.rows) {
      this.curY += 1;
    } else {
      this.ScrollUp();
    }

    if (this.scrollingRegion && this.scrollingRegion != this.rows && this.scrollingRegion[1] == this.curY) {
      this.ScrollUp();
    }
  },

  /*
    Writes the character(ch) into current cursor position and advances
    cursor position.
  */
  __PushChar : function(ch) {
    if (this.curX >= this.cols) {
      this.__NewLine();
    }

    if (this.insertMode) {
      for (var x = this.cols - 1; x >= this.curX + 1; --x) {
        this.screen[this.curY][x] = this.screen[this.curY][x - 1];
      }
      this.screen[this.curY][this.curX] = new cloneObject(this.blank);
    }

    this.screen[this.curY][this.curX].c = ch.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\x20/g, "&nbsp;");
    this.screen[this.curY][this.curX].style = this.curRendition.noStyle ? this.resetStyle : this.curRendition;
    this.curX += 1;

    this.isLineDirty[this.curY] = true;
  },

  /*
    Parses escape sequence from the input and returns the index after escape
    sequence, the escape sequence character and parameter for the escape
    sequence
  */
  __ParseEscSeq : function(text, index) {
    var textlen = text.length;
    var interChars = null;
    while (index < textlen) {
      var ch = text[index];
      var ascii = ch.charCodeAt(0);

      if (ascii >= 32 && ascii <= 63) {
        // intermediate char (32 - 47)
        // parameter chars (48 - 63)
        if (!interChars) {
          interChars = ch;
        } else {
          interChars += ch;
        }
      } else if (ascii >= 64 && ascii <= 125) {
        // final char
        return [index + 1, String.fromCharCode(ascii), interChars];
      } else {
        //print "Unexpected characters in escape sequence ", ch
      }

      index += 1;
    }

    // the escape sequence is not complete, inform this to caller by giving
    // '?' as final char
    return [index, '?', interChars];
  },

  /*
    Tries to parse escape sequence from input and if its not complete then
    puts it in unparsedInput and process it when the ProcessInput called
    next time.
  */
  __HandleEscSeq : function(text, index) {

    //console.log('esc '+text.substring(index,index+7).toSource());
    if (text[index] == '[') {
      index += 1;
      var result = this.__ParseEscSeq(text, index);
      index = result[0];
      var finalChar = result[1];
      var interChars = result[2];

      if (finalChar == '?') {
        this.unparsedInput = "\033[";
        if (interChars) {
          this.unparsedInput += interChars;
        }
      } else if (this.escSeqHandlers[finalChar]) {
        this.escSeqHandlers[finalChar](interChars);
      } else {
        var escSeq = "";
        if (interChars) {
          escSeq += interChars;
        }

        escSeq += finalChar;

        //if (this.callbacks[this.CALLBACK_UNHANDLED_ESC_SEQ]) {
        //  this.callbacks[this.CALLBACK_UNHANDLED_ESC_SEQ](escSeq);
        //}
        if (text[index]) {
          debug('Unhandled [ escape: ' + text[index].toSource());
        }
      }
    } else if (text[index] == ']') {
      var textlen = text.length;
      if (index + 2 < textlen) {
        if (text[index + 1] == '0' && text[index + 2] == ';') {
          // parse title, terminated by bell char(\007)
          index += 3; // ignore '0' and ';'
          var start = index;
          while (index < textlen) {
            if (text[index].charCodeAt(0) == this.__ASCII_BEL) {
              break;
            }

            index += 1;
          }

          this.__OnEscSeqTitle(text.substring(start, index));
        }
      }
    } else if (['>', '=', '7', '8'].indexOf(text[index]) != -1) {  // ignore, DECPNM, DECPAM, DECSC, DECRC
      index += 1;
    } else if (text[index] == '(') {  // setusg0, setspecg0
      if (this.escParenSeqHandlers[text[index + 1]]) {
        this.escParenSeqHandlers[text[index + 1]]();
      }
      index += 2;
    } else {
      if (text[index]) {
        debug('Unhandled reg. escape: ' + text[index].toSource());
      }
    }

    return index;
  },

  /*
    Handler for bell character
  */
  belAudio : null,
  enableBell : true,
  __OnCharBel : function(text, index) {
    if (!this.enableBell) {
      return;
    }

    var output = new Audio();
    output.mozSetup(1, 44100);  // channels, rate
    if (this.belAudio) {
      output.mozWriteAudio(this.belAudio);
    } else {
      var samples = new Float32Array(sys.platform == 'win32' ? 8192 : 512); // data
      var len = samples.length;

      for (var i = 0; i < samples.length ; i++) {
        samples[i] = Math.sin( 2 * Math.PI * 4000 * i / 44100 ) * 0.025;   // 4000 = frequency, 44100 = sampling rate, 0.025 = amplitude
      }
      output.mozWriteAudio(samples);
      this.belAudio = samples;
    }

    return index + 1;
  },

  /*
    Handler for backspace character
  */
  __OnCharBS : function(text, index) {
    if (this.curX > 0) {
      this.curX -= 1;
    }

    return index + 1;
  },

  /*
    Handler for horizontal tab character
  */
  __OnCharHT : function(text, index) {
    while (true) {
      this.curX += 1;
      if (this.curX % 8 == 0) {
        break;
      }
    }
    return index + 1;
  },

  /*
    Handler for line feed character
  */
  __OnCharLF : function(text, index) {
    this.__NewLine();
    return index + 1;
  },

  /*
    Handler for carriage return character
  */
  __OnCharCR : function(text, index) {
    this.curX = 0;
    return index + 1;
  },

  /*
    Handler for XON character
  */
  __OnCharXON : function(text, index) {
    this.ignoreChars = false;
    return index + 1;
  },

  /*
    Handler for XOFF character
  */
  __OnCharXOFF : function(text, index) {
    this.ignoreChars = true;
    return index + 1;
  },

  /*
    Handler for escape character
  */
  __OnCharESC : function(text, index) {
    index += 1;
    if (index < text.length) {
      index = this.__HandleEscSeq(text, index);
    }

    return index;
  },

  /*
    Handler for control sequence introducer(CSI) character
  */
  __OnCharCSI : function(text, index) {
    index += 1;
    index = this.__HandleEscSeq(text, index);
    return index;
  },

  /*
    Dummy handler for unhandler characters
  */
  __OnCharIgnore : function(text, index) {
    return index + 1;
  },

  /*
    Handler for window title escape sequence
  */
  __OnEscSeqTitle : function(params) {
    document.title = params + " - FireSSH";
  },

  ////////////////////////////////////////////////////////////
  // CSI sequences

  ___unary : function params(params, def) {
    if (def == null) {
      def = 1;
    }
    return (params != null) ? parseInt(params) : def;
  },

  /*
    Handler for escape sequence ICH
  */
  __OnEscSeqICH : function(params) {
    var n = this.___unary(params);

    for (var x = this.cols - 1; x >= this.curX + n; --x) {
      this.screen[this.curY][x] = this.screen[this.curY][x - n];
    }
    for (var x = this.curX + n - 1; x >= this.curX; --x) {
      this.screen[this.curY][x] = new cloneObject(this.blank);
    }

    this.isLineDirty[this.curY] = true;
  },

  /*
    Handler for escape sequence CUU
  */
  __OnEscSeqCUU : function(params) {
    var n = this.___unary(params);

    this.curY -= n;
    if (this.curY < 0) {
      this.curY = 0;
    }
  },

  /*
    Handler for escape sequence CUD
  */
  __OnEscSeqCUD : function(params) {
    var n = this.___unary(params);

    this.curY += n;
    if (this.curY >= this.rows) {
      this.curY = this.rows - 1;
    }
  },

  /*
    Handler for escape sequence CUF
  */
  __OnEscSeqCUF : function(params) {
    var n = this.___unary(params);

    this.curX += n;
    if (this.curX >= this.cols) {
      this.curX = this.cols - 1;
    }
  },

  /*
    Handler for escape sequence CUB
  */
  __OnEscSeqCUB : function(params) {
    var n = this.___unary(params);

    this.curX -= n;
    if (this.curX < 0) {
      this.curX = 0;
    }
  },

  /*
    Handler for escape sequence CHA
  */
  __OnEscSeqCHA : function(params) {
    if (params == null) {
      //print "WARNING: CHA without parameter"
      return;
    }

    var col = parseInt(params);

    // convert it to zero based index
    col -= 1;
    if (col >= 0 && col < this.cols) {
      this.curX = col;
    } else {
      //print "WARNING: CHA column out of boundary"
    }
  },

  /*
    Handler for escape sequence CUP
  */
  __OnEscSeqCUP : function(params) {
    var y = 0;
    var x = 0;

    if (params != null) {
      var values = params.split(';');
      if (values.length == 2) {
        y = parseInt(values[0]) - 1;
        x = parseInt(values[1]) - 1;
      } else {
        //print "WARNING: escape sequence CUP has invalid parameters"
        return;
      }
    }

    if (x < 0) {
      x = 0;
    } else if (x >= this.cols) {
      x = this.cols - 1;
    }

    if (y < 0) {
      y = 0;
    } else if (y >= this.rows) {
      y = this.rows - 1;
    }

    this.curX = x;
    this.curY = y;
  },

  /*
    Handler for escape sequence ED
  */
  __OnEscSeqED : function(params) {
    var n = this.___unary(params, 0);

    if (n == 0) {
      this.ClearRect(this.curY, this.curX, this.rows - 1, this.cols - 1);
    } else if (n == 1) {
      this.ClearRect(0, 0, this.curY, this.curX);
    } else if (n == 2) {
      this.ClearRect(0, 0, this.rows - 1, this.cols - 1);
    } else {
      //print "WARNING: escape sequence ED has invalid parameter"
    }
  },

  /*
    Handler for escape sequence IL
  */
  __OnEscSeqIL : function(params) {
    var n = this.___unary(params);

    for (var x = 0; x < n; ++x) {
      this.ScrollDown();
    }
  },

  /*
    Handler for escape sequence DL
  */
  __OnEscSeqDL : function(params) {
    var n = this.___unary(params);

    for (var x = 0; x < n; ++x) {
      this.ScrollUp();
    }
  },

  /*
    Handler for escape sequence DCH
  */
  __OnEscSeqDCH : function(params) {
    var n = this.___unary(params);

    for (var x = this.curX; x < this.cols - n; ++x) {
      this.screen[this.curY][x] = this.screen[this.curY][x + n];
    }
    for (var x = this.cols - n; x < this.cols; ++x) {
      this.screen[this.curY][x] = new cloneObject(this.blank);
    }

    this.isLineDirty[this.curY] = true;
  },

  /*
    Handler for escape sequence SU
  */
  __OnEscSeqSU : function(params) {
    var n = this.___unary(params);

    for (var x = 0; x < n; ++x) {
      this.ScrollUp();
    }
  },

  /*
    Handler for escape sequence SD
  */
  __OnEscSeqSD : function(params) {
    var n = this.___unary(params);

    for (var x = 0; x < n; ++x) {
      this.ScrollDown();
    }
  },

  /*
    Handler for escape sequence EL
  */
  __OnEscSeqEL : function(params) {
    var n = this.___unary(params, 0);

    if (n == 0) {
      this.ClearRect(this.curY, this.curX, this.curY, this.cols - 1);
    } else if (n == 1) {
      this.ClearRect(this.curY, 0, this.curY, this.curX);
    } else if (n == 2) {
      this.ClearRect(this.curY, 0, this.curY, this.cols - 1);
    } else {
      //print "WARNING: escape sequence EL has invalid parameter"
    }
  },

  /*
    Handler for escape sequence VPA
  */
  __OnEscSeqVPA : function(params) {
    if (params == null) {
      //print "WARNING: VPA without parameter"
      return;
    }

    var row = parseInt(params);

    // convert it to zero based index
    row -= 1;
    if (row >= 0 && row < this.rows) {
      this.curY = row;
    } else {
      //print "WARNING: VPA line no. out of boundary"
    }
  },

  /*
    Handler for escape sequence DECSET
  */
  __OnEscSeqDECSET : function(params) {
    if (params == null) {
      //print "WARNING: VPA without parameter"
      return;
    }
    if (params[0] == '?') {
      params = params.substring(1).split(';');
      if (params.indexOf('1049') != -1) {
        this.origScreen = this.screen;
        this.origScrRendition = this.scrRendition;
        this.screen = [];
        this.scrRendition = [];

        for (var i = 0; i < this.rows; ++i) {
          var line = [];

          for (var j = 0; j < this.cols; ++j) {
            line.push(new cloneObject(this.blank));
          }

          this.screen.push(line);
          this.scrRendition.push("");
          this.isLineDirty[i] = false;
        }

        this.refresh = true;

        // XXX hack for now, we ignore scrolling region by telling shell to resize again
        //gConnection.shell.resize_pty(this.cols, this.rows - 1);
        //gConnection.shell.resize_pty(this.cols, this.rows);
      }
    } else {
      params = params.split(';');
      if (params.indexOf('4') != -1) {
        this.insertMode = true;
      }
    }
    //this.onTerminalReset();
    //this.updateScreen(true);
  },

  /*
    Handler for escape sequence DECRST
  */
  __OnEscSeqDECRST : function(params) {
    if (params == null) {
      //print "WARNING: VPA without parameter"
      return;
    }
    if (params[0] == '?') {
      params = params.substring(1).split(';');
      if (params.indexOf('1049') != -1) {
        this.screen = this.origScreen;
        this.scrRendition = this.origScrRendition;

        this.origScreen = null;
        this.origScrRendition = null;
        this.refresh = true;
      }
    } else {
      params = params.split(';');
      if (params.indexOf('4') != -1) {
        this.insertMode = false;
      }
    }

    //this.onTerminalReset();
    //this.updateScreen(true);
  },

  colors : ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'],

  /*
    Handler for escape sequence SGR
  */
  __OnEscSeqSGR : function(params) {
    if (params != null) {
      var renditions = params.split(';');
      for (var x = 0; x < renditions.length; ++x) {
        var rendition = renditions[x];
        var irendition = parseInt(rendition);
        if (irendition) {
          if (this.curRendition.noStyle) {
            this.curRendition = new cloneObject(this.resetStyle);
            this.curRendition.noStyle = false;
          } else {
            this.curRendition = new cloneObject(this.curRendition);
          }
        }

        switch (irendition) {
          case 0:
            this.curRendition = this.resetStyle;
            this.negativeColors = false;
            break;
          case 1:
            this.curRendition.fontWeight = 'bold';
            break;
          case 2:
            this.curRendition.opacity = '.5';
            break;
          case 3:
            this.curRendition.fontStyle = 'italic';
            break;
          case 4:
            this.curRendition.textDecoration = 'underline';
            break;
          case 5:
          case 6:
            this.curRendition.textDecoration = 'blink'; // god forgive me
            break;
          case 7:
            this.negativeColors = true;
            var tempColor = this.curRendition.color ? this.curRendition.color : this.defaultColor;
            this.curRendition.color = this.curRendition.backgroundColor ? this.curRendition.backgroundColor : this.defaultBGColor;
            this.curRendition.backgroundColor = tempColor;
            break;
          case 8:
            this.curRendition.visibility = 'hidden';
            break;
          case 9:
            this.curRendition.textDecoration = 'line-through';
            break;
          case 21:
            this.curRendition.fontWeight = 'normal';
            break;
          case 22:
            this.curRendition.fontWeight = 'normal';
            this.curRendition.opacity = '1';
            break;
          case 23:
            this.curRendition.fontStyle = 'normal';
            break;
          case 24:
          case 25:
            this.curRendition.textDecoration = 'none';
            break;
          case 27:
            this.negativeColors = false;
            break;
          case 28:
            this.curRendition.visibility = 'visible';
            break;
          case 29:
            this.curRendition.textDecoration = 'none';
            break;
          case 30:
          case 31:
          case 32:
          case 33:
          case 34:
          case 35:
          case 36:
          case 37:
            if (this.negativeColors) {
              this.curRendition.backgroundColor = this.colors[irendition - 30];
            } else {
              this.curRendition.color = this.colors[irendition - 30];
            }
            break;
          case 39:
            if (this.negativeColors) {
              this.curRendition.backgroundColor = '';
            } else {
              this.curRendition.color = '';
            }
            break;
          case 40:
          case 41:
          case 42:
          case 43:
          case 44:
          case 45:
          case 46:
          case 47:
            if (this.negativeColors) {
              this.curRendition.color = this.colors[irendition - 40];
            } else {
              this.curRendition.backgroundColor = this.colors[irendition - 40];
            }
            break;
          case 49:
            if (this.negativeColors) {
              this.curRendition.color = '';
            } else {
              this.curRendition.backgroundColor = '';
            }
            break;
          default:
            break;
        }
      }
    } else {
      // reset rendition
      this.curRendition = this.resetStyle;
      this.negativeColors = false;
    }

    //print "Current attribute", self.curAttrib
  },

  /*
    Handler for Scrolling region
  */
  __OnEscSeqDECSTBM : function(params) {
    if (params != null) {
      var region = params.split(';');
      this.scrollingRegion = [parseInt(region[0]), parseInt(region[1])];
    }
  },

  /*
    Handler for window manipulation
  */
  __OnEscSeqDECWINMAN : function(params) {
    if (params != null) {
      params = params.split(';');
      if (params[0] == '8') {
        var width  = parseInt(params[2]) * this.letterWidth  + 50;
        var height = parseInt(params[1]) * this.letterHeight + 7;

        window.resizeTo(width, height);
      }
    }
  },

  /*
    Set United States G0 character set
  */
  __OnEscParenSeqUsg0 : function() {
    this.graphicsCharactersMode = false;
  },

  /*
    Set G0 special chars. & line set
  */
  __OnEscParenSeqSpecg0 : function() {
    this.graphicsCharactersMode = true;
  },

  //{{{ unused
  onFocus : function() {
    this.isFocused = true;

    if (this.cursor && this.initialScroll) {
      this.cursor.style.border = "";
      this.cursor.style.top = (parseInt(this.cursor.style.top) + 1) + 'px';
      this.cursor.style.left = (parseInt(this.cursor.style.left) + 1) + 'px';
      this.cursor.style.backgroundColor = this.defaultColor;
    }

    this.body.focus();
  },

  onBlur : function() {
    this.isFocused = false;

    if (this.cursor && this.initialScroll) {
      this.cursor.style.border = "1px solid " + this.defaultColor;
      this.cursor.style.top = (parseInt(this.cursor.style.top) - 1) + 'px';
      this.cursor.style.left = (parseInt(this.cursor.style.left) - 1) + 'px';
      this.cursor.style.backgroundColor = "";
    }
  },

  lastResizeTime : Date.now(),
  finalResizeTimeout : null,

  onResize : function(initOnly) {
    var cols = parseInt((this.body.clientWidth - 50) / this.letterWidth);
    var rows = parseInt((this.body.clientHeight - 7) / this.letterHeight);

    var widthDiff  = (this.body.clientWidth - 50) % this.letterWidth;
    var heightDiff = (this.body.clientHeight - 7) % this.letterHeight;

    window.resizeBy(-1 * widthDiff, -1 * heightDiff);

    if (initOnly) {
      this.rows = rows;
      this.cols = cols;

      return;
    }

    this.lastResizeTime = Date.now();

    if (rows == this.rows && cols == this.cols) {
      return;
    }

    this.Resize(rows, cols);

    if (gConnection && gConnection.isConnected && gConnection.isReady) {
      gConnection.shell.resize_pty(cols, rows);
    }
  },
  // }}}

  resetAppearance : function() {
    //this.body.style.font = this.fontSize + " " + this.font;
    this.body.style.backgroundColor = this.defaultBGColor;
    this.body.style.color = this.defaultColor;

    //this.letterHeight = this.doc.getElementById('opening').offsetHeight;
  }
};
