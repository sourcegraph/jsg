var CoffeeScript = require("coffee-script");
var path = require("path");
var SourceMap = require("source-map");
var util = require("util");

// Store all of the source maps for later reference
exports.sourceMaps = {}
// Store original files before transpilation
exports.original = {}
// Store transpiled files
exports.transformed = {}

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
	var sourceMap = exports.sourceMaps[filename];
	if(sourceMap == null) return graph;

	var mapConsumer = new SourceMap.SourceMapConsumer(sourceMap);
	mapConsumer.eachMapping(function(m) {
		//console.log(m);
		console.log(util.format("{%d, %d} to {%d, %d}", m.generatedLine, m.generatedColumn, m.originalLine, m.originalColumn));
	});

	//var sourceNode = SourceMap.SourceNode.fromStringWithSourceMap(exports.transformed[filename], mapConsumer);
	//console.log(JSON.stringify(sourceNode, null, 2));

	function remapChar(charPos) {
		var genLineCol = characterToLineColumn(exports.transformed[filename], charPos)
		var originalLineCol = mapConsumer.originalPositionFor(genLineCol);
		return lineColumnToCharacter(exports.original[filename], originalLineCol)
	}

	function remapRange(range) {
		range = range.split("-");
		var start  = parseInt(range[0]);
		var end = parseInt(range[1]);

		console.log(start + "-" + end + " to " + remapChar(start) + "-" + remapChar(end));

		return remapChar(start) + "-" + remapChar(end);
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
			var transformed = CoffeeScript.compile(code, { sourceMap : true });

			//Keep track of the source map and both code files
			exports.sourceMaps[filename] = transformed.v3SourceMap;
			exports.original[filename] = code;
			exports.transformed[filename] = transformed.js;

			return transformed.js;
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