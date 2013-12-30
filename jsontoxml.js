//copyright Ryan Day 2010 <http://ryanday.org>, Joscha Feth 2013 <http://www.feth.com>, João Parreira 2013 [MIT Licensed]


"use strict";

//noinspection JSUnresolvedFunction
var mLang = require('mout/lang'),
    mMap = require('mout/array/map'),
    mForOwn = require('mout/object/forOwn'),
    mStringRepeat = require('mout/string/repeat');


var elementStartChar = "a-zA-Z_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FFF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD",
    elementNonStartChar = "\\-.0-9\u00B7\u0300-\u036F\u203F\u2040",
    elementReplace = new RegExp("^([^" + elementStartChar + "])|^((x|X)(m|M)(l|L))|([^" + elementStartChar + elementNonStartChar + "])", "g");

var processToXml = function (nodeData, options) {

    var makeNode = function (name, content, attributes, level, hasSubNodes) {

        var indentValue, indent, node;
        //noinspection JSUnresolvedVariable
        indentValue = options.indent || "\t";
        //noinspection JSUnresolvedVariable
        indent = options.prettyPrint ? '\n' + mStringRepeat(indentValue, level) : '';
        //noinspection JSUnresolvedVariable
        if (options.removeIllegalNameCharacters) {
            name = name.replace(elementReplace, '_');
        }

        node = indent + '<' + name + (attributes || '');
        if (content && content.length > 0) {
            node += '>' + content + (hasSubNodes ? indent : '') + '</' + name + '>';
        } else {
            node += '/>';
        }
        return node;
    };

    return (function fn(nodeData, nodeDescriptor, level) {
        var type = typeof nodeData, ret = '', content = '', attributes = '', nodes = '';
        if (mLang.isArray(nodeData)) {
            type = 'array';
        } else if (nodeData instanceof Date) {
            type = 'date';
        }

        switch (type) {
            //if value is an array create child nodes from values
            case 'array':
                ret = '';
                nodeData = mMap(nodeData, function (val) {
                    ret += fn(val, 1, level + 1);
                });
                //noinspection JSUnresolvedVariable
                if (options.prettyPrint) {
                    ret += '\n';
                }
                return ret;

            case 'date':
                // cast dates to ISO 8601 date (soap likes it)
                return nodeData.toJSON ? nodeData.toJSON() : String(nodeData);

            case 'object':
                if (nodeDescriptor === 1 && nodeData.name) {
                    if (nodeData.attrs) {
                        if (typeof nodeData.attrs !== 'object') {
                            attributes += ' ' + nodeData.attrs;
                        } else {
                            mForOwn(nodeData.attrs, function (val, key) {
                                attributes += ' ' + key + '="' + options.escape ? esc(val) : val + '"';
                            });
                        }
                    }

                    //later attributes can be added here
                    if (typeof nodeData.value !== 'undefined') {
                        content += options.escape ? esc(String(nodeData.value)) : String(nodeData.value);
                    } else if (typeof nodeData.text !== 'undefined') {
                        content += options.escape ? esc(String(nodeData.text)) : String(nodeData.text);
                    }

                    if (nodeData.children) {
                        content += fn(nodeData.children, 0, level + 1);
                    }
                    return makeNode(nodeData.name, content, attributes, level, !!nodeData.children);

                }
                mForOwn(nodeData, function (val, key) {
                    nodes += makeNode(key, fn(val, 0, level + 1), null, level + 1);
                });
                //noinspection JSUnresolvedVariable
                if (options.prettyPrint && nodes.length > 0) {
                    nodes += '\n';
                }
                return nodes;
            case 'function':
                return nodeData();
            default:
                return options.escape ? esc(nodeData) : String(nodeData);
        }

    }(nodeData, 0, 0));
};


var xmlHeader = function (options) {
    options = options || {};
    //noinspection JSUnresolvedVariable
    var ret = '<?xml version="' + options.version || '1.0' + '" encoding="' + options.encoding || 'utf-8' + '" ';
    //noinspection JSUnresolvedVariable
    if (options.standalone) {
        ret += 'standalone="yes"';
    }
    ret += '?>';
    return ret;
};

//noinspection JSUnresolvedVariable
module.exports = function (obj, options) {

    //noinspection JSUnresolvedVariable
    var docType = '', header = '', Buffer = this.Buffer || function Buffer() {};

    if (typeof obj === 'string' || obj instanceof Buffer) {
        try {
            obj = JSON.parse(obj.toString());
        } catch (e) {
            return false;
        }
    }

    if (options) {
        if (typeof options === 'object') {
            // our config is an object

            //noinspection JSUnresolvedVariable
            if (options.xmlHeader) {
                // the user wants an xml header
                //noinspection JSUnresolvedVariable
                header = xmlHeader(options.xmlHeader);
            }

            //noinspection JSUnresolvedVariable
            if (options.docType !== undefined) {
                //noinspection JSUnresolvedVariable
                docType = '<!DOCTYPE ' + options.docType + '>';
            }
        } else {
            header = xmlHeader();
        }
    }
    options = options || {};

    //noinspection JSUnresolvedVariable
    return header + (options.prettyPrint && docType ? '\n' : '') + docType + processToXml(obj, options);
};

//noinspection JSUnresolvedVariable
module.exports.jsonToXml = module.exports.objToXml = module.exports;

//noinspection JSUnresolvedVariable
module.exports.escape = esc;

function esc(str) {
    return String(str).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;')
        .replace(/"/g, '&quot;');
}

//noinspection JSUnresolvedVariable
module.exports.cdata = cdata;

function cdata(str) {
    if (str) {
        return "<![CDATA[" + str.replace(/\]\]>/g, '') + ']]>';
    }
    return "<![CDATA[]]>";
}