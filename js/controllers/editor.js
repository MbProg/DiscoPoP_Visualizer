'use strict';

var $ = require('jquery');
window.$ = require('jquery');
var jstree = require('jstree');
var Range = ace.require('ace/range').Range;

/**
 * Class for controlling the code-viewer in the visualzier
 */
class EditorController {
  /**
   * Constructs the EditorController
   * @param  {FileMap[]} fileMaps The fileMaps object from DiscoPoP
   */
  constructor(fileMaps) {
    this._ranges = [];
    this._gutterDecorations = [];
    this._fileMaps = fileMaps;
    let fileTreeData = [];

    // Remove irrelevant portion from paths
    if (fileMaps.length > 1) {
      let irrelevantPath = "";
      let paths = [];
      _.each(fileMaps, function(value, key) {
        paths.push(value.path);
      });
      let A = paths.concat().sort();
      let a1 = A[0];
      let a2 = A[A.length - 1]
      let L = a1.length;
      let i = 0;
      let j;
      let parts;
      let containedTreeNodes = [];
      let pathPartsLength;
      let shortPath;

      // Create file-tree object (multiple files)
      while (i < L && a1.charAt(i) === a2.charAt(i)) {
        i++;
      }
      irrelevantPath = a1.substring(0, i);
      _.each(fileMaps, function(value, key) {
        shortPath = value.path.replace(irrelevantPath, '');
        parts = shortPath.split('/');
        pathPartsLength = parts.length;
        if (parts.length > 1) {
          if (containedTreeNodes.indexOf(parts[0]) == -1) {
            fileTreeData.push({
              id: parts[0],
              parent: '#',
              text: parts[0],
              type: 'folder'
            });
          }
          containedTreeNodes.push(parts[0]);
          shortPath = parts[0];
          for (j = 1; j < pathPartsLength - 1; j++) {
            if (containedTreeNodes.indexOf(shortPath + "/" + parts[j]) == -1) {
              fileTreeData.push({
                id: shortPath + "/" + parts[j],
                parent: shortPath,
                text: parts[j],
                type: 'folder'
              });
              containedTreeNodes.push(shortPath + "/" + parts[j]);
            }
            shortPath += "/" + parts[j];
          }
          fileTreeData.push({
            id: key,
            parent: shortPath,
            text: parts[j],
            type: 'file'
          });
        } else {
          fileTreeData.push({
            id: key,
            parent: '#',
            text: value.fileName,
            type: 'file'
          });
        }
      });
    } else {
      // Create file-tree object (single file)
      _.each(fileMaps, function(value, key) {
        fileTreeData.push({
          id: key,
          parent: '#',
          text: value.fileName,
          type: 'file'
        });
      });
    }
    console.log("fileTreeData", fileTreeData);

    // Initialize file-tree
    $("#file-select-container").jstree("destroy");
    $("#file-select-container").empty();
    $("#file-select-container").jstree({
      "plugins": [
        "search",
        "sort",
        "types",
        "unique",
        "wholerow"
      ],
      "core": {
        "animation": 1,
        "themes": {
          'variant': 'large'
        },
        "dblclick_toggle": true,
        'data': fileTreeData
      },
      "types": {
        "folder": {
          "icon": "glyphicon glyphicon-folder-open"
        },
        "file": {
          "icon": "glyphicon glyphicon-file"
        }
      }
    });

    var containerHeight = $("#code-container").height();
    $("#code-container").height(containerHeight - 30);
    // Initialize ace editor block
    this._editor = ace.edit(document.getElementById('ace-editor'));
    this._editor.setTheme("ace/theme/monokai");
    this._editor.getSession().setMode("ace/mode/c_cpp");
    this._editor.setReadOnly(true);
    this._editor.setHighlightActiveLine(false);
    this._editor.setOptions({
      fontSize: "14pt",
      wrapBehavioursEnabled: true,
      animatedScroll: true
    });
    this._editor.$blockScrolling = Infinity;
  }

  /**
   * Highlights the code section of a given node
   * @param  {(CuNode|FunctionNode|LoopNode)} node The node to be highlighted in the code
   */
  highlightNodeInCode(node) {
    var that = this;
    var Range = ace.require('ace/range').Range;
    var fileID = node.fileId;
    var start = node.startLine;
    var end = node.endLine;
    if (node.type > 0) {
      var range = new Range(start - 1, 0, end, 0);
      this._ranges.push(range);
      this._editor.addSelectionMarker(
        range
      );
    }else{
      _.each(node.lines, function(lineNumber){
        var range = new Range(lineNumber - 1, 0, lineNumber, 0);
        that._ranges.push(range);
        that._editor.addSelectionMarker(
          range
        );
      });
    }
    this.displayFile(fileID);
    this._editor.gotoLine(end, 0, true);
    _.each(node.readLines, function(line) {
      // Mark read-lines
      start = line;
      that._editor.session.addGutterDecoration(start - 1, 'editor_read_decoration');
      that._gutterDecorations[start - 1] = 'editor_read_decoration';
    });
    _.each(node.writeLines, function(line) {
      // Mark write-lines
      start = line;
      if (that._gutterDecorations[start - 1] != null) {
        that._editor.session.removeGutterDecoration(start - 1, 'editor_read_decoration');
        that._editor.session.addGutterDecoration(start - 1, 'editor_read_write_decoration');
        that._gutterDecorations[start - 1] = 'editor_read_write_decoration';
      } else {
        // Mark read-write-lines
        that._editor.session.addGutterDecoration(start - 1, 'editor_write_decoration');
        that._gutterDecorations[start - 1] = 'editor_write_decoration';
      }
    });


  }

  /**
   * Highlights a dependency in the code
   * @param  {Dependency} dependency  The dependency to be highlighted
   * @param  {string}     type        The type of the dependency
   */
  highlightDependencyInCode(dependency) {
    var fileID = dependency.sinkLine;
    var sourceLine = dependency.sourceLine;
    var sinkLine = dependency.sinkLine;
    var sourceRange = new Range(sourceLine - 1, 0, sourceLine, 0);
    var sinkRange = new Range(sinkLine - 1, 0, sinkLine, 0);
    this._ranges.push(sourceRange);
    this._ranges.push(sinkRange);
    this._editor.addSelectionMarker(
      sourceRange
    );
    this._editor.addSelectionMarker(
      sinkRange
    );
    this._editor.gotoLine(sourceLine, 0, true);
    if (sinkLine != sourceLine) {
      if (dependency.isRaW()) {
        this._editor.session.addGutterDecoration(sourceLine - 1, 'editor_read_decoration');
        this._editor.session.addGutterDecoration(sinkLine - 1, 'editor_write_decoration');
        this._gutterDecorations[sourceLine - 1] = 'editor_read_decoration';
        this._gutterDecorations[sinkLine - 1] = 'editor_write_decoration';
      }
      if (dependency.isWaR()) {
        this._editor.session.addGutterDecoration(sourceLine - 1, 'editor_write_decoration');
        this._editor.session.addGutterDecoration(sinkLine - 1, 'editor_read_decoration');
        this._gutterDecorations[sourceLine - 1] = 'editor_write_decoration';
        this._gutterDecorations[sinkLine - 1] = 'editor_read_decoration';
      }
      if (dependency.isWaW()) {
        this._editor.session.addGutterDecoration(sourceLine - 1, 'editor_write_decoration');
        this._editor.session.addGutterDecoration(sinkLine - 1, 'editor_write_decoration');
        this._gutterDecorations[sourceLine - 1] = 'editor_write_decoration';
        this._gutterDecorations[sinkLine - 1] = 'editor_write_decoration';
      }
    } else if (dependency.isWaW()) {
      this._editor.session.addGutterDecoration(sourceLine - 1, 'editor_write_decoration');
      this._gutterDecorations[sourceLine - 1] = 'editor_write_decoration';
    } else {
      this._editor.session.addGutterDecoration(sourceLine - 1, 'editor_read_write_decoration');
      this._gutterDecorations[sourceLine - 1] = 'editor_read_write_decoration';
    }
  }

  /**
   * Highlights a given line in the currently visible editor
   * @param  {number} line The line to be highlighted
   */
  highlightLine(line) {
    var range = new Range(line - 1, 0, line, 0);
    this._ranges.push(range);
    this._editor.addSelectionMarker(
      range
    );
    this._editor.gotoLine(line - 1, 0, true);
  }

  /**
   * Displays the decoration for a write in the editor on the given line
   * @param  {number} line The line to be decorated
   */
  showWriteOnLine(line) {
    this._editor.session.addGutterDecoration(line, 'editor_write_decoration');
    this._gutterDecorations[line] = 'editor_write_decoration';
  }

  /**
   * Displays the decoration for a read in the editor on the given line
   * @param  {number} line The line to be decorated
   */
  showReadOnLine(line) {
    this._editor.session.addGutterDecoration(line, 'editor_read_decoration');
    this._gutterDecorations[line] = 'editor_read_decoration';
  }

  /**
   * Displays the decoration for a read-write in the editor on the given line
   * @param  {number} line The line to be decorated
   */
  showReadWriteOnLine(line) {
    this._editor.session.addGutterDecoration(line, 'editor_read_write_decoration');
    this._gutterDecorations[line] = 'editor_read_write_decoration';
  }

  /**
   * Unhighlights all of the lines in the editor
   */
  unhighlight() {
    var that = this;
    _.forEach(this._ranges, function(range) {
      that._editor.removeSelectionMarker(range);
    });
    this._ranges = [];
    _.forEach(this._gutterDecorations, function(value, key) {
      that._editor.session.removeGutterDecoration(key, value);
    });
    this._gutterDecorations = [];
  }

  /**
   * Displays the file with the given fileID
   * @param  {number} fileID The ID of the file to be displayed
   */
  displayFile(fileID) {
    console.log('displayFile', fileID);
    if (this._currentFileID !== fileID) {
      this._editor.setValue(this._fileMaps[fileID].fileContent, -1);
      this._currentFileID = fileID;
      $('#file-select').val(fileID);
      $('#code-container-tab').html(this._fileMaps[fileID].fileName);
    }
  }

  /**
   * Gets the line over which the cursor is currently pointing
   * @return {number} The line over which the cursor is currently pointing
   */
  getCursorRow() {
    return this._editor.selection.getCursor().row;
  }

  /**
   * Gets the id of the file currently being displayed
   * @return {number} The id of the file currently being displayed
   */
  getCurrentFileID() {
    return this._currentFileID;
  }
}

module.exports = EditorController;
