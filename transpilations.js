var CoffeeScript = require("coffee-script-redux");
var path = require("path");
var SourceMap = require("source-map");
var util = require("util");

// Persist data between transpile and remap calls
exports.data = {}

// Transpile the code if it matches one of the known transpilable languages - else, return original code
exports.transpile = function(filename, code) {
	// Check if any file extensions match
	var extension = path.extname(filename);
	for(var langage in exports.languages) {
		if(extension == exports.languages[langage].extension) {
			return exports.languages[langage].transpile(filename, code);
		}
	}
	return code;
}

// Given a set of symbols or refs, remap the characters using a sourcemap
exports.remap = function(filename, graph) {
	if(exports.data[filename] == null) return graph;

	var mapConsumer = new SourceMap.SourceMapConsumer(exports.data[filename].map.toString());

	function remapToken(charPos) {
		var genLineCol = characterToLineColumn(exports.data[filename].code, charPos)
		var originalLineCol = mapConsumer.originalPositionFor(genLineCol);

		function walkAST(ast, linecol) {
			if("loc" in ast) {
				if(linecol.line == ast.loc.start.line && linecol.column == ast.loc.start.column) {
					return ast;
				}
			}

			for(propname in ast) {
				if(typeof ast[propname] == "object") {
					var result = walkAST(ast[propname], linecol);
					if(result != null) return result;
				}
			}
			return null;
		}

		var node = walkAST(exports.data[filename].jsAST.body, originalLineCol);
		if(node && node.name) {
			var start = lineColumnToCharacter(exports.data[filename].original, originalLineCol);
			var end = start + node.name.length;
			return {
				start : start,
				end : end
			}
		}
		else {
			return null;
		}
	}

	function remapRange(range) {
		range = range.split("-");
		var start  = parseInt(range[0]);

		var newRange = remapToken(start);

		if(newRange)
			return newRange.start + "-" + newRange.end;
		else
			return null;
	}

	graph.forEach(function(item) {
		if(item.ident) item.ident = remapRange(item.ident);
		if(item.defn) item.defn = remapRange(item.defn);
		if(item.span) item.span = remapRange(item.span);
	});

	return graph;
}

// All transpilable languages should be registered in this object
exports.languages = {
	// CoffeeScript transpilation
	coffescript : {
		extension : ".coffee",
		transpile : function(filename, code) {
			var csAST = CoffeeScript.parse(code, {
				optimise: false,
				raw: true,
				inputSource: filename
			});
			var jsAST = CoffeeScript.compile(csAST, {
				bare: true
			});

			exports.data[filename] = CoffeeScript.jsWithSourceMap(jsAST, filename, {
				compact: false
			});
			exports.data[filename].original = code;

			// Store AST's
			exports.data[filename].jsAST = jsAST;
			exports.data[filename].csAST = csAST;

			return exports.data[filename].code;
		}
	}
}

// Helper function that takes a character position, and files the {line, col}
function characterToLineColumn(code, character) {
	var lines = code.split("\n");
	var position = 0;

	for(var i = 0; i < lines.length; ++i) {
		if(character < position + lines[i].length + 1) {
			return {
				line : i + 1,
				column : (character - position)
			}
		}
		else {
			position += lines[i].length + 1;
		}
	}
}

// Helper function that maps a {line, col} object to the actual character position
function lineColumnToCharacter(code, linecol) {
	var lines = code.split("\n");
	var position = 0;

	for(var i = 0; i < lines.length; ++i) {
		if(linecol.line == i + 1) {
			return position + linecol.column
		}
		else {
			position += lines[i].length + 1;
		}
	}
}