// Erotic Chat Hypnosis Suite (ECHS) v0.85.3. Loaded at runtime by the installed loader;
// this file is not a userscript. Install https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/HypnosisAddon.user.js
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/bondage-club-mod-sdk/dist/bcmodsdk.js
  var require_bcmodsdk = __commonJS({
    "node_modules/bondage-club-mod-sdk/dist/bcmodsdk.js"(exports) {
      var bcModSdk2 = (function() {
        "use strict";
        const o = "1.2.0";
        function e(o2) {
          alert("Mod ERROR:\n" + o2);
          const e2 = new Error(o2);
          throw console.error(e2), e2;
        }
        const t = new TextEncoder();
        function n(o2) {
          return !!o2 && "object" == typeof o2 && !Array.isArray(o2);
        }
        function r(o2) {
          const e2 = /* @__PURE__ */ new Set();
          return o2.filter(((o3) => !e2.has(o3) && e2.add(o3)));
        }
        const i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set();
        function c(o2) {
          a.has(o2) || (a.add(o2), console.warn(o2));
        }
        function s(o2) {
          const e2 = [], t2 = /* @__PURE__ */ new Map(), n2 = /* @__PURE__ */ new Set();
          for (const r3 of f.values()) {
            const i3 = r3.patching.get(o2.name);
            if (i3) {
              e2.push(...i3.hooks);
              for (const [e3, a2] of i3.patches.entries()) t2.has(e3) && t2.get(e3) !== a2 && c(`ModSDK: Mod '${r3.name}' is patching function ${o2.name} with same pattern that is already applied by different mod, but with different pattern:
Pattern:
${e3}
Patch1:
${t2.get(e3) || ""}
Patch2:
${a2}`), t2.set(e3, a2), n2.add(r3.name);
            }
          }
          e2.sort(((o3, e3) => e3.priority - o3.priority));
          const r2 = (function(o3, e3) {
            if (0 === e3.size) return o3;
            let t3 = o3.toString().replaceAll("\r\n", "\n");
            for (const [n3, r3] of e3.entries()) t3.includes(n3) || c(`ModSDK: Patching ${o3.name}: Patch ${n3} not applied`), t3 = t3.replaceAll(n3, r3);
            return (0, eval)(`(${t3})`);
          })(o2.original, t2);
          let i2 = function(e3) {
            var t3, i3;
            const a2 = null === (i3 = (t3 = m.errorReporterHooks).hookChainExit) || void 0 === i3 ? void 0 : i3.call(t3, o2.name, n2), c2 = r2.apply(this, e3);
            return null == a2 || a2(), c2;
          };
          for (let t3 = e2.length - 1; t3 >= 0; t3--) {
            const n3 = e2[t3], r3 = i2;
            i2 = function(e3) {
              var t4, i3;
              const a2 = null === (i3 = (t4 = m.errorReporterHooks).hookEnter) || void 0 === i3 ? void 0 : i3.call(t4, o2.name, n3.mod), c2 = n3.hook.apply(this, [e3, (o3) => {
                if (1 !== arguments.length || !Array.isArray(e3)) throw new Error(`Mod ${n3.mod} failed to call next hook: Expected args to be array, got ${typeof o3}`);
                return r3.call(this, o3);
              }]);
              return null == a2 || a2(), c2;
            };
          }
          return { hooks: e2, patches: t2, patchesSources: n2, enter: i2, final: r2 };
        }
        function l(o2, e2 = false) {
          let r2 = i.get(o2);
          if (r2) e2 && (r2.precomputed = s(r2));
          else {
            let e3 = window;
            const a2 = o2.split(".");
            for (let t2 = 0; t2 < a2.length - 1; t2++) if (e3 = e3[a2[t2]], !n(e3)) throw new Error(`ModSDK: Function ${o2} to be patched not found; ${a2.slice(0, t2 + 1).join(".")} is not object`);
            const c2 = e3[a2[a2.length - 1]];
            if ("function" != typeof c2) throw new Error(`ModSDK: Function ${o2} to be patched not found`);
            const l2 = (function(o3) {
              let e4 = -1;
              for (const n2 of t.encode(o3)) {
                let o4 = 255 & (e4 ^ n2);
                for (let e5 = 0; e5 < 8; e5++) o4 = 1 & o4 ? -306674912 ^ o4 >>> 1 : o4 >>> 1;
                e4 = e4 >>> 8 ^ o4;
              }
              return ((-1 ^ e4) >>> 0).toString(16).padStart(8, "0").toUpperCase();
            })(c2.toString().replaceAll("\r\n", "\n")), d2 = { name: o2, original: c2, originalHash: l2 };
            r2 = Object.assign(Object.assign({}, d2), { precomputed: s(d2), router: () => {
            }, context: e3, contextProperty: a2[a2.length - 1] }), r2.router = /* @__PURE__ */ (function(o3) {
              return function(...e4) {
                return o3.precomputed.enter.apply(this, [e4]);
              };
            })(r2), i.set(o2, r2), e3[r2.contextProperty] = r2.router;
          }
          return r2;
        }
        function d() {
          for (const o2 of i.values()) o2.precomputed = s(o2);
        }
        function p() {
          const o2 = /* @__PURE__ */ new Map();
          for (const [e2, t2] of i) o2.set(e2, { name: e2, original: t2.original, originalHash: t2.originalHash, sdkEntrypoint: t2.router, currentEntrypoint: t2.context[t2.contextProperty], hookedByMods: r(t2.precomputed.hooks.map(((o3) => o3.mod))), patchedByMods: Array.from(t2.precomputed.patchesSources) });
          return o2;
        }
        const f = /* @__PURE__ */ new Map();
        function u(o2) {
          f.get(o2.name) !== o2 && e(`Failed to unload mod '${o2.name}': Not registered`), f.delete(o2.name), o2.loaded = false, d();
        }
        function g(o2, t2) {
          o2 && "object" == typeof o2 || e("Failed to register mod: Expected info object, got " + typeof o2), "string" == typeof o2.name && o2.name || e("Failed to register mod: Expected name to be non-empty string, got " + typeof o2.name);
          let r2 = `'${o2.name}'`;
          "string" == typeof o2.fullName && o2.fullName || e(`Failed to register mod ${r2}: Expected fullName to be non-empty string, got ${typeof o2.fullName}`), r2 = `'${o2.fullName} (${o2.name})'`, "string" != typeof o2.version && e(`Failed to register mod ${r2}: Expected version to be string, got ${typeof o2.version}`), o2.repository || (o2.repository = void 0), void 0 !== o2.repository && "string" != typeof o2.repository && e(`Failed to register mod ${r2}: Expected repository to be undefined or string, got ${typeof o2.version}`), null == t2 && (t2 = {}), t2 && "object" == typeof t2 || e(`Failed to register mod ${r2}: Expected options to be undefined or object, got ${typeof t2}`);
          const i2 = true === t2.allowReplace, a2 = f.get(o2.name);
          a2 && (a2.allowReplace && i2 || e(`Refusing to load mod ${r2}: it is already loaded and doesn't allow being replaced.
Was the mod loaded multiple times?`), u(a2));
          const c2 = (o3) => {
            let e2 = g2.patching.get(o3.name);
            return e2 || (e2 = { hooks: [], patches: /* @__PURE__ */ new Map() }, g2.patching.set(o3.name, e2)), e2;
          }, s2 = (o3, t3) => (...n2) => {
            var i3, a3;
            const c3 = null === (a3 = (i3 = m.errorReporterHooks).apiEndpointEnter) || void 0 === a3 ? void 0 : a3.call(i3, o3, g2.name);
            g2.loaded || e(`Mod ${r2} attempted to call SDK function after being unloaded`);
            const s3 = t3(...n2);
            return null == c3 || c3(), s3;
          }, p2 = { unload: s2("unload", (() => u(g2))), hookFunction: s2("hookFunction", ((o3, t3, n2) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to patch a function: Expected function name string, got ${typeof o3}`);
            const i3 = l(o3), a3 = c2(i3);
            "number" != typeof t3 && e(`Mod ${r2} failed to hook function '${o3}': Expected priority number, got ${typeof t3}`), "function" != typeof n2 && e(`Mod ${r2} failed to hook function '${o3}': Expected hook function, got ${typeof n2}`);
            const s3 = { mod: g2.name, priority: t3, hook: n2 };
            return a3.hooks.push(s3), d(), () => {
              const o4 = a3.hooks.indexOf(s3);
              o4 >= 0 && (a3.hooks.splice(o4, 1), d());
            };
          })), patchFunction: s2("patchFunction", ((o3, t3) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to patch a function: Expected function name string, got ${typeof o3}`);
            const i3 = l(o3), a3 = c2(i3);
            n(t3) || e(`Mod ${r2} failed to patch function '${o3}': Expected patches object, got ${typeof t3}`);
            for (const [n2, i4] of Object.entries(t3)) "string" == typeof i4 ? a3.patches.set(n2, i4) : null === i4 ? a3.patches.delete(n2) : e(`Mod ${r2} failed to patch function '${o3}': Invalid format of patch '${n2}'`);
            d();
          })), removePatches: s2("removePatches", ((o3) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to patch a function: Expected function name string, got ${typeof o3}`);
            const t3 = l(o3);
            c2(t3).patches.clear(), d();
          })), callOriginal: s2("callOriginal", ((o3, t3, n2) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to call a function: Expected function name string, got ${typeof o3}`);
            const i3 = l(o3);
            return Array.isArray(t3) || e(`Mod ${r2} failed to call a function: Expected args array, got ${typeof t3}`), i3.original.apply(null != n2 ? n2 : globalThis, t3);
          })), getOriginalHash: s2("getOriginalHash", ((o3) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to get hash: Expected function name string, got ${typeof o3}`);
            return l(o3).originalHash;
          })) }, g2 = { name: o2.name, fullName: o2.fullName, version: o2.version, repository: o2.repository, allowReplace: i2, api: p2, loaded: true, patching: /* @__PURE__ */ new Map() };
          return f.set(o2.name, g2), Object.freeze(p2);
        }
        function h() {
          const o2 = [];
          for (const e2 of f.values()) o2.push({ name: e2.name, fullName: e2.fullName, version: e2.version, repository: e2.repository });
          return o2;
        }
        let m;
        const y = void 0 === window.bcModSdk ? window.bcModSdk = (function() {
          const e2 = { version: o, apiVersion: 1, registerMod: g, getModsInfo: h, getPatchingInfo: p, errorReporterHooks: Object.seal({ apiEndpointEnter: null, hookEnter: null, hookChainExit: null }) };
          return m = e2, Object.freeze(e2);
        })() : (n(window.bcModSdk) || e("Failed to init Mod SDK: Name already in use"), 1 !== window.bcModSdk.apiVersion && e(`Failed to init Mod SDK: Different version already loaded ('1.2.0' vs '${window.bcModSdk.version}')`), window.bcModSdk.version !== o && alert(`Mod SDK warning: Loading different but compatible versions ('1.2.0' vs '${window.bcModSdk.version}')
One of mods you are using is using an old version of SDK. It will work for now but please inform author to update`), window.bcModSdk);
        return "undefined" != typeof exports && (Object.defineProperty(exports, "__esModule", { value: true }), exports.default = y), y;
      })();
    }
  });

  // node_modules/lz-string/libs/lz-string.js
  var require_lz_string = __commonJS({
    "node_modules/lz-string/libs/lz-string.js"(exports, module) {
      var LZString = (function() {
        var f = String.fromCharCode;
        var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
        var baseReverseDic = {};
        function getBaseValue(alphabet, character) {
          if (!baseReverseDic[alphabet]) {
            baseReverseDic[alphabet] = {};
            for (var i = 0; i < alphabet.length; i++) {
              baseReverseDic[alphabet][alphabet.charAt(i)] = i;
            }
          }
          return baseReverseDic[alphabet][character];
        }
        var LZString2 = {
          compressToBase64: function(input) {
            if (input == null) return "";
            var res = LZString2._compress(input, 6, function(a) {
              return keyStrBase64.charAt(a);
            });
            switch (res.length % 4) {
              // To produce valid Base64
              default:
              // When could this happen ?
              case 0:
                return res;
              case 1:
                return res + "===";
              case 2:
                return res + "==";
              case 3:
                return res + "=";
            }
          },
          decompressFromBase64: function(input) {
            if (input == null) return "";
            if (input == "") return null;
            return LZString2._decompress(input.length, 32, function(index) {
              return getBaseValue(keyStrBase64, input.charAt(index));
            });
          },
          compressToUTF16: function(input) {
            if (input == null) return "";
            return LZString2._compress(input, 15, function(a) {
              return f(a + 32);
            }) + " ";
          },
          decompressFromUTF16: function(compressed) {
            if (compressed == null) return "";
            if (compressed == "") return null;
            return LZString2._decompress(compressed.length, 16384, function(index) {
              return compressed.charCodeAt(index) - 32;
            });
          },
          //compress into uint8array (UCS-2 big endian format)
          compressToUint8Array: function(uncompressed) {
            var compressed = LZString2.compress(uncompressed);
            var buf = new Uint8Array(compressed.length * 2);
            for (var i = 0, TotalLen = compressed.length; i < TotalLen; i++) {
              var current_value = compressed.charCodeAt(i);
              buf[i * 2] = current_value >>> 8;
              buf[i * 2 + 1] = current_value % 256;
            }
            return buf;
          },
          //decompress from uint8array (UCS-2 big endian format)
          decompressFromUint8Array: function(compressed) {
            if (compressed === null || compressed === void 0) {
              return LZString2.decompress(compressed);
            } else {
              var buf = new Array(compressed.length / 2);
              for (var i = 0, TotalLen = buf.length; i < TotalLen; i++) {
                buf[i] = compressed[i * 2] * 256 + compressed[i * 2 + 1];
              }
              var result = [];
              buf.forEach(function(c) {
                result.push(f(c));
              });
              return LZString2.decompress(result.join(""));
            }
          },
          //compress into a string that is already URI encoded
          compressToEncodedURIComponent: function(input) {
            if (input == null) return "";
            return LZString2._compress(input, 6, function(a) {
              return keyStrUriSafe.charAt(a);
            });
          },
          //decompress from an output of compressToEncodedURIComponent
          decompressFromEncodedURIComponent: function(input) {
            if (input == null) return "";
            if (input == "") return null;
            input = input.replace(/ /g, "+");
            return LZString2._decompress(input.length, 32, function(index) {
              return getBaseValue(keyStrUriSafe, input.charAt(index));
            });
          },
          compress: function(uncompressed) {
            return LZString2._compress(uncompressed, 16, function(a) {
              return f(a);
            });
          },
          _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
            if (uncompressed == null) return "";
            var i, value, context_dictionary = {}, context_dictionaryToCreate = {}, context_c = "", context_wc = "", context_w = "", context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2, context_data = [], context_data_val = 0, context_data_position = 0, ii;
            for (ii = 0; ii < uncompressed.length; ii += 1) {
              context_c = uncompressed.charAt(ii);
              if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                context_dictionary[context_c] = context_dictSize++;
                context_dictionaryToCreate[context_c] = true;
              }
              context_wc = context_w + context_c;
              if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                context_w = context_wc;
              } else {
                if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                  if (context_w.charCodeAt(0) < 256) {
                    for (i = 0; i < context_numBits; i++) {
                      context_data_val = context_data_val << 1;
                      if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                      } else {
                        context_data_position++;
                      }
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 8; i++) {
                      context_data_val = context_data_val << 1 | value & 1;
                      if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                      } else {
                        context_data_position++;
                      }
                      value = value >> 1;
                    }
                  } else {
                    value = 1;
                    for (i = 0; i < context_numBits; i++) {
                      context_data_val = context_data_val << 1 | value;
                      if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                      } else {
                        context_data_position++;
                      }
                      value = 0;
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 16; i++) {
                      context_data_val = context_data_val << 1 | value & 1;
                      if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                      } else {
                        context_data_position++;
                      }
                      value = value >> 1;
                    }
                  }
                  context_enlargeIn--;
                  if (context_enlargeIn == 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                  }
                  delete context_dictionaryToCreate[context_w];
                } else {
                  value = context_dictionary[context_w];
                  for (i = 0; i < context_numBits; i++) {
                    context_data_val = context_data_val << 1 | value & 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = value >> 1;
                  }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) {
                  context_enlargeIn = Math.pow(2, context_numBits);
                  context_numBits++;
                }
                context_dictionary[context_wc] = context_dictSize++;
                context_w = String(context_c);
              }
            }
            if (context_w !== "") {
              if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                  for (i = 0; i < context_numBits; i++) {
                    context_data_val = context_data_val << 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                  }
                  value = context_w.charCodeAt(0);
                  for (i = 0; i < 8; i++) {
                    context_data_val = context_data_val << 1 | value & 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = value >> 1;
                  }
                } else {
                  value = 1;
                  for (i = 0; i < context_numBits; i++) {
                    context_data_val = context_data_val << 1 | value;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = 0;
                  }
                  value = context_w.charCodeAt(0);
                  for (i = 0; i < 16; i++) {
                    context_data_val = context_data_val << 1 | value & 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = value >> 1;
                  }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) {
                  context_enlargeIn = Math.pow(2, context_numBits);
                  context_numBits++;
                }
                delete context_dictionaryToCreate[context_w];
              } else {
                value = context_dictionary[context_w];
                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1 | value & 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              }
              context_enlargeIn--;
              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }
            }
            value = 2;
            for (i = 0; i < context_numBits; i++) {
              context_data_val = context_data_val << 1 | value & 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
            while (true) {
              context_data_val = context_data_val << 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data.push(getCharFromInt(context_data_val));
                break;
              } else context_data_position++;
            }
            return context_data.join("");
          },
          decompress: function(compressed) {
            if (compressed == null) return "";
            if (compressed == "") return null;
            return LZString2._decompress(compressed.length, 32768, function(index) {
              return compressed.charCodeAt(index);
            });
          },
          _decompress: function(length, resetValue, getNextValue) {
            var dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [], i, w, bits, resb, maxpower, power, c, data = { val: getNextValue(0), position: resetValue, index: 1 };
            for (i = 0; i < 3; i += 1) {
              dictionary[i] = i;
            }
            bits = 0;
            maxpower = Math.pow(2, 2);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            switch (next = bits) {
              case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                c = f(bits);
                break;
              case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                c = f(bits);
                break;
              case 2:
                return "";
            }
            dictionary[3] = c;
            w = c;
            result.push(c);
            while (true) {
              if (data.index > length) {
                return "";
              }
              bits = 0;
              maxpower = Math.pow(2, numBits);
              power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              switch (c = bits) {
                case 0:
                  bits = 0;
                  maxpower = Math.pow(2, 8);
                  power = 1;
                  while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                      data.position = resetValue;
                      data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                  }
                  dictionary[dictSize++] = f(bits);
                  c = dictSize - 1;
                  enlargeIn--;
                  break;
                case 1:
                  bits = 0;
                  maxpower = Math.pow(2, 16);
                  power = 1;
                  while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                      data.position = resetValue;
                      data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                  }
                  dictionary[dictSize++] = f(bits);
                  c = dictSize - 1;
                  enlargeIn--;
                  break;
                case 2:
                  return result.join("");
              }
              if (enlargeIn == 0) {
                enlargeIn = Math.pow(2, numBits);
                numBits++;
              }
              if (dictionary[c]) {
                entry = dictionary[c];
              } else {
                if (c === dictSize) {
                  entry = w + w.charAt(0);
                } else {
                  return null;
                }
              }
              result.push(entry);
              dictionary[dictSize++] = w + entry.charAt(0);
              enlargeIn--;
              w = entry;
              if (enlargeIn == 0) {
                enlargeIn = Math.pow(2, numBits);
                numBits++;
              }
            }
          }
        };
        return LZString2;
      })();
      if (typeof define === "function" && define.amd) {
        define(function() {
          return LZString;
        });
      } else if (typeof module !== "undefined" && module != null) {
        module.exports = LZString;
      } else if (typeof angular !== "undefined" && angular != null) {
        angular.module("LZString", []).factory("LZString", function() {
          return LZString;
        });
      }
    }
  });

  // src/main.ts
  var import_bondage_club_mod_sdk = __toESM(require_bcmodsdk());

  // src/log.ts
  var TAG = "[HypnosisAddon]";
  var DEBUG_KEY = "ECHS_DEBUG";
  function readDebugFlag() {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(DEBUG_KEY) === "true";
    } catch {
      return false;
    }
  }
  var debugFlag = readDebugFlag();
  function isDebugFlagOn() {
    return debugFlag;
  }
  function setDebugFlag(on) {
    debugFlag = on;
    try {
      localStorage.setItem(DEBUG_KEY, on ? "true" : "false");
      return true;
    } catch {
      return false;
    }
  }
  function isDebugLogging() {
    return debugFlag || inTestingRoom();
  }
  function log(...args) {
    if (!isDebugLogging()) return;
    console.debug(TAG, ...args);
  }
  function warn(...args) {
    console.warn(TAG, ...args);
  }
  function info(...args) {
    console.info(TAG, ...args);
  }
  var TESTING_ROOM = "hypno testing";
  var FORCE_TESTING = false;
  function isTestingMode() {
    return FORCE_TESTING || inTestingRoom();
  }
  function inTestingRoom() {
    try {
      const name = typeof ChatRoomData !== "undefined" && ChatRoomData ? ChatRoomData.Name : null;
      return typeof name === "string" && name.trim().toLowerCase() === TESTING_ROOM;
    } catch {
      return false;
    }
  }

  // src/notify.ts
  var roomVoice = () => true;
  function setRoomVoice(fn) {
    roomVoice = fn;
  }
  function tellPlayer(message) {
    if (typeof ChatRoomSendLocal !== "function") return;
    ChatRoomSendLocal(`[${message}]`);
  }
  function tellRoom(message) {
    if (!roomVoice()) return;
    if (typeof ChatRoomSendEmote !== "function" || typeof ServerPlayerIsInChatRoom !== "function") return;
    if (!ServerPlayerIsInChatRoom()) return;
    try {
      ChatRoomSendEmote(`**${message}`);
    } catch (err) {
      warn("could not emote to the room:", err);
    }
  }
  var PRONOUNS = {
    SheHer: { their: "her", them: "her", themselves: "herself" },
    HeHim: { their: "his", them: "him", themselves: "himself" },
    TheyThem: { their: "their", them: "them", themselves: "themselves" },
    ItIt: { their: "its", them: "it", themselves: "itself" }
  };
  function pronouns() {
    const name = typeof Player?.GetPronouns === "function" ? Player.GetPronouns() : void 0;
    return PRONOUNS[name] ?? PRONOUNS.TheyThem;
  }
  function fillTokens(template) {
    const p = pronouns();
    return template.replace(/\{name\}/g, String(Player?.Nickname || Player?.Name || "Someone")).replace(/\{their\}/g, p.their).replace(/\{them\}/g, p.them).replace(/\{themselves\}/g, p.themselves);
  }

  // src/messaging.ts
  var HIDDEN_TAG = "HypnoMsg";
  var handlers = /* @__PURE__ */ new Map();
  function registerHiddenHandler(type, handler) {
    handlers.set(type, handler);
  }
  function sendHiddenMessage(message, target) {
    ServerSend("ChatRoomChat", {
      Content: HIDDEN_TAG,
      Type: "Hidden",
      Target: target ?? null,
      Dictionary: [{ message }]
    });
  }
  function handleIncomingHidden(data) {
    if (data?.Type === "Hidden" && data?.Content === HIDDEN_TAG && typeof data?.Sender === "number") {
      const message = data?.Dictionary?.[0]?.message;
      if (!message) return true;
      const handler = handlers.get(message.type);
      if (handler) {
        handler(data.Sender, message);
      } else {
        log(`hidden message from ${data.Sender}:`, message);
        tellPlayer(`hidden message from ${data.Sender}: ${JSON.stringify(message)}`);
      }
      return true;
    }
    return false;
  }

  // src/effects.ts
  var EMOTICON_ASSET_NAME = "Emoticon";
  var MANAGED_EFFECTS = ["Freeze", "BlockWardrobe", "DenialMode", "Leash"];
  function findEmoticonItem(character) {
    return character?.Appearance?.find((a) => a?.Asset?.Name === EMOTICON_ASSET_NAME);
  }
  function ensureEffectsAllowed() {
    if (typeof Asset === "undefined" || !Array.isArray(Asset) || Asset.length === 0) return false;
    const assets = Asset.filter((a) => a?.Name === EMOTICON_ASSET_NAME);
    if (assets.length === 0) return false;
    for (const asset of assets) {
      asset.AllowEffect ?? (asset.AllowEffect = []);
      for (const effect of MANAGED_EFFECTS) {
        if (!asset.AllowEffect.includes(effect)) asset.AllowEffect.push(effect);
      }
    }
    return true;
  }
  function installEffectAllowList() {
    if (ensureEffectsAllowed()) {
      log("Emoticon effect allow-list patched");
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (ensureEffectsAllowed()) {
        clearInterval(timer);
        log(`Emoticon effect allow-list patched after ${tries} retries`);
      } else if (tries >= 60) {
        clearInterval(timer);
        log("gave up patching Emoticon effect allow-list \u2014 BC assets never appeared");
      }
    }, 500);
  }
  var POSE_GROUPS = {
    stance: ["Kneel", "KneelingSpread", "Spread", "LegsClosed", "AllFours", "Hogtied", "BaseLower"],
    arms: ["BackCuffs", "BackBoxTie", "BackElbowTouch", "OverTheHead", "Yoked", "BaseUpper"]
  };
  var FULL_BODY_POSES = ["AllFours", "Hogtied"];
  function poseGroupOf(pose) {
    if (POSE_GROUPS.stance.includes(pose)) return "stance";
    if (POSE_GROUPS.arms.includes(pose)) return "arms";
    return null;
  }
  var ours = { stance: null, arms: null };
  function currentPoses() {
    const p = Player?.ActivePose;
    if (Array.isArray(p)) return p.filter((x) => typeof x === "string");
    return typeof p === "string" && p ? [p] : [];
  }
  function setSuggestedPose(pose, group = poseGroupOf(pose ?? "") ?? "stance") {
    const before = currentPoses();
    const otherGroup = group === "stance" ? "arms" : "stance";
    const keep = before.filter((p) => poseGroupOf(p) === otherGroup);
    if (pose !== null) {
      CharacterSetActivePose(Player, pose);
    } else {
      CharacterSetActivePose(Player, null);
      for (const p of keep) CharacterSetActivePose(Player, p);
    }
    if (ServerPlayerIsInChatRoom()) {
      ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose });
    }
    const after = currentPoses();
    const landed = pose !== null ? after.includes(pose) : !after.some((p) => POSE_GROUPS[group].includes(p) && !p.startsWith("Base"));
    const lost = keep.filter((p) => !after.includes(p) && !FULL_BODY_POSES.includes(p));
    if (lost.length && !FULL_BODY_POSES.includes(pose ?? "")) warn(`pose: setting ${group} to ${pose ?? "neutral"} also lost ${lost.join(", ")}`);
    if (landed) ours[group] = pose;
    else log(`pose: ${group} \u2192 ${pose ?? "neutral"} did not take; ActivePose=${JSON.stringify(Player?.ActivePose)}`);
    return landed;
  }
  function suggestedPose() {
    const now = currentPoses();
    const list = ["stance", "arms"].map((g) => ours[g]).filter((p) => !!p && now.includes(p));
    return list.length ? list : null;
  }
  function restoreSuggestedPose(saved) {
    const list = Array.isArray(saved) ? saved : saved ? [saved] : [];
    for (const p of list) if (typeof p === "string" && p) setSuggestedPose(p);
  }
  function clearSuggestedPose(group, only) {
    const now = currentPoses();
    for (const g of group ? [group] : ["stance", "arms"]) {
      const p = ours[g];
      if (only && p !== only) continue;
      ours[g] = null;
      if (p && now.includes(p)) setSuggestedPose(null, g);
    }
  }
  var speechBlocked = false;
  var screenFade = 0;
  var TRANCE_FADE_OPACITY = 0.3;
  var WALKING_FADE_OPACITY = 0.08;
  var walkingTrance = false;
  function setWalkingTrance(on) {
    walkingTrance = on;
  }
  function isWalkingTrance() {
    return walkingTrance;
  }
  function setSpeechBlocked(blocked) {
    speechBlocked = blocked;
  }
  function isSpeechBlocked() {
    return speechBlocked;
  }
  function setScreenFade(opacity) {
    screenFade = Math.max(0, Math.min(1, opacity));
  }
  function getScreenFade() {
    return screenFade;
  }
  var VEIL_WIDTH = 1003;
  function drawTranceVeil() {
    if (screenFade <= 0) return;
    MainCanvas.save();
    MainCanvas.fillStyle = `rgba(255, 255, 255, ${screenFade})`;
    MainCanvas.fillRect(0, 0, VEIL_WIDTH, MainCanvasHeight);
    MainCanvas.restore();
  }
  function clearTranceStates() {
    speechBlocked = false;
    screenFade = 0;
    walkingTrance = false;
  }
  function applyEffect(effectName, character = Player) {
    var _a;
    const item = findEmoticonItem(character);
    if (!item) {
      warn(`no Emoticon item found on ${character?.Name ?? "target"}, cannot apply effect`);
      return false;
    }
    ensureEffectsAllowed();
    item.Property ?? (item.Property = {});
    (_a = item.Property).Effect ?? (_a.Effect = []);
    if (!item.Property.Effect.includes(effectName)) {
      item.Property.Effect.push(effectName);
    }
    if (character === Player) {
      refreshOwnEffects();
      if (ServerPlayerIsInChatRoom()) ChatRoomCharacterUpdate(Player);
    }
    return true;
  }
  function refreshOwnEffects() {
    if (typeof CharacterLoadEffect === "function") CharacterLoadEffect(Player);
  }
  function hasOwnEffect(effectName) {
    return !!findEmoticonItem(Player)?.Property?.Effect?.includes(effectName);
  }
  function removeEffect(effectName, character = Player) {
    const item = findEmoticonItem(character);
    const effects = item?.Property?.Effect;
    if (!effects) return false;
    const idx = effects.indexOf(effectName);
    if (idx === -1) return false;
    effects.splice(idx, 1);
    if (character === Player) {
      refreshOwnEffects();
      if (ServerPlayerIsInChatRoom()) ChatRoomCharacterUpdate(Player);
    }
    return true;
  }

  // src/suppression.ts
  var active = /* @__PURE__ */ new Set();
  function setSuppressed(category, on) {
    if (on) active.add(category);
    else active.delete(category);
  }
  function isSuppressed(category) {
    return active.has(category);
  }
  var numb = false;
  function setNumb(on) {
    numb = on;
  }
  function isNumb() {
    return numb;
  }
  function clearAllSuppression() {
    active.clear();
    numb = false;
  }
  function targetsPlayer(data, metadata) {
    if (metadata?.TargetMemberNumber != null) return metadata.TargetMemberNumber === Player.MemberNumber;
    return data?.Sender !== Player.MemberNumber && !!ChatRoomMessageInvolvesPlayer?.(data);
  }
  var ACTION_TAGS = {
    ChangeClothes: "clothing"
  };
  function isItemSlot(group, isRestraint) {
    return group?.Category === "Item" || !!isRestraint || !!group?.IsRestraint;
  }
  function classify(data, metadata) {
    if (data?.Type === "Activity" || metadata?.ActivityName) return "activity";
    if (data?.Type !== "Action") return null;
    const assets = metadata?.Assets ? Object.values(metadata.Assets) : [];
    if (assets.some((a) => isItemSlot(a?.Group, a?.IsRestraint))) return "bondage";
    if (assets.length > 0) return "clothing";
    const group = metadata?.FocusGroup;
    if (group) return isItemSlot(group) ? "bondage" : "clothing";
    const tag = typeof data?.Content === "string" ? ACTION_TAGS[data.Content] : void 0;
    return tag ?? null;
  }
  function installSuppression() {
    if (typeof ChatRoomRegisterMessageHandler !== "function") {
      warn("ChatRoomRegisterMessageHandler missing \u2014 suppression not installed");
      return;
    }
    ChatRoomRegisterMessageHandler({
      Description: "HypnosisAddon: hide suppressed categories (after arousal, before display)",
      Priority: 320,
      Callback: (data, _sender, _msg, metadata) => {
        try {
          if (active.size === 0) return false;
          const category = classify(data, metadata);
          if (!category || !active.has(category)) return false;
          if (!targetsPlayer(data, metadata)) return false;
          log(`suppressed ${category} message:`, data?.Content);
          return true;
        } catch (err) {
          warn("suppression handler failed:", err);
          return false;
        }
      }
    });
    log("suppression handler registered at priority 320");
    installNumbness();
  }
  var AROUSAL_HANDLER = "Arousal processing";
  function installNumbness() {
    ChatRoomRegisterMessageHandler({
      Description: "HypnosisAddon: numbness (skip arousal, leave the message alone)",
      Priority: 205,
      Callback: (data, sender, _msg, metadata) => {
        try {
          if (!numb) return false;
          if (!metadata?.ActivityName) return false;
          if (metadata?.TargetMemberNumber !== Player?.MemberNumber) return false;
          if (sender?.MemberNumber === Player?.MemberNumber) return false;
          log(`numb to ${metadata.ActivityName} \u2014 skipping arousal`);
          return { skip: (h) => h?.Description === AROUSAL_HANDLER };
        } catch (err) {
          warn("numbness handler failed:", err);
          return false;
        }
      }
    });
    const handlers3 = typeof ChatRoomMessageHandlers !== "undefined" ? ChatRoomMessageHandlers : null;
    if (handlers3 && !handlers3.some((h) => h?.Description === AROUSAL_HANDLER)) {
      warn(`WARNING: no handler named "${AROUSAL_HANDLER}" \u2014 numbness will not block arousal`);
    }
    log("numbness handler registered at priority 205");
  }

  // src/flavor.ts
  var PUBLIC_LINES = {
    "movement-block": [
      "{name} goes very still, mid-motion.",
      "{name} stops moving, as though the idea had gone."
    ],
    "movement-release": ["{name} moves again, a little unsteadily.", "Something lets go of {name}."],
    // Follow is observable in the same way going still is: nobody sees the compulsion land,
    // but they see {name} close the distance and keep it closed. Naming {name} is required —
    // room lines carry no sender.
    "follow-block": [
      "{name} stays close, unwilling to let any distance open.",
      "{name} keeps near, as though on an invisible leash."
    ],
    "follow-release": ["{name} steps back, {their} own distance to keep again."],
    kneel: ["{name} melts down to {their} knees and looks quietly content to be there.", "{name} kneels, unhurried and unquestioning, as if it were the sweetest idea in the world."],
    stand: ["{name} rises, without seeming to decide to.", "{name} is on {their} feet again."],
    // Every pose is as visible as kneeling, so each gets a room line. The body moves first and
    // the face stays soft, the same register as kneel.
    "kneel-spread": ["{name} sinks to {their} knees and lets them drift apart, unhurried."],
    "legs-spread": ["{name}'s feet slide apart until {their} stance is wide and open."],
    "legs-closed": ["{name}'s feet draw together and stay there, neat and still."],
    "all-fours": ["{name} goes down onto {their} hands and knees and stays there, content."],
    "lie-down": ["{name} lowers {themselves} to the floor and lies there, face down and quiet."],
    "hands-behind": ["{name}'s hands find each other behind {their} back and stay clasped there."],
    "arms-behind": ["{name}'s arms fold behind {their} back, forearms laid neatly together."],
    "elbows-behind": ["{name}'s elbows draw back behind {them} until they almost touch."],
    "arms-up": ["{name}'s arms rise over {their} head and stay there."],
    "arms-out": ["{name}'s arms lift out to either side and hold there, level."],
    "arms-relax": ["{name}'s arms drift down to {their} sides."],
    "pose-blocked": ["{name} shifts, trying to obey, but {their} body will not go there."],
    // Placing a restriction is invisible — nothing happens for anyone to see. Only bumping
    // INTO one is observable, which is why the attempt keys carry the public lines and the
    // apply keys mostly do not. Movement and posture are the exceptions: going still and
    // kneeling are visible in themselves.
    // Undressing is the most observable thing in the add-on — it changes the character
    // everyone in the room is looking at, so unlike every other apply-time effect these get
    // a public line rather than staying silent.
    undress: [
      "{name} slips out of something slow and dreamy, and doesn't seem to mind being watched.",
      "{name}'s hands undo a fastening while {their} face stays somewhere soft and far away.",
      "Something of {name}'s comes off, set aside without a glance, unhurried and unbothered."
    ],
    "undress-all": [
      "{name} undresses steadily, piece after piece, dreamy and unhurried and glad to be seen.",
      "{name} bares everything with the soft, unbothered thoroughness of a habit."
    ],
    "undress-blocked": [
      "{name}'s hands move to undress and stop, held.",
      "{name} starts to undo something and cannot make {their} hands finish."
    ],
    "undress-frozen": [
      "{name} does not move to undress. {name} does not move at all."
    ],
    // A ghost is visible from outside as a hesitation and no more — which is exactly what it
    // is. The room should not be able to tell it apart from someone losing their thread.
    "trigger-ghost": [
      "{name} pauses, as though half-hearing {their} own name.",
      "Something goes across {name}'s face and does not stay."
    ],
    "clothing-blocked-attempt": [
      "{name} reaches for {their} clothes, and {their} hand drifts away again.",
      "{name} half-reaches for a fastening and seems to forget why."
    ],
    "selftouch-frozen": ["{name} twitches towards {themselves}, and nothing moves."],
    "selftouch-blocked": [
      "{name} starts to reach for {themselves}, aches to, and doesn't.",
      "{name}'s hands stay exactly where they are, though {their} whole body plainly wishes otherwise."
    ],
    "speech-blocked-attempt": [
      "{name} opens {their} mouth, and nothing comes out.",
      "{name} tries to say something, and does not."
    ],
    "orgasm-refused": ["{name} strains for it, trembling, and something holds {them} back."],
    "orgasm-held": ["{name} shudders right at the brink, and does not go over."]
  };
  var LINES = {
    "movement-block": [
      "Your body simply stops listening to you.",
      "You tell your legs to move. Nothing happens.",
      "Somewhere far off you decide to move, and the message never arrives."
    ],
    "movement-release": [
      "Control seeps back into your limbs.",
      "Your body is yours again. You hadn't noticed it stopped being.",
      "Something lets go of you, and you can move."
    ],
    "follow-block": [
      "Being near them is where you belong. The thought of letting distance open is faintly unbearable.",
      "Wherever they go, you go. It does not feel like a decision.",
      "An invisible tether draws you to their side, and staying there is the only comfortable place to be."
    ],
    "follow-release": [
      "The tether loosens. You can be your own distance from them again.",
      "The pull to stay near fades, and where you stand is your own choice once more."
    ],
    // Apply-time: a possibility closing, with nothing reached for yet.
    "clothing-block": [
      "The idea of changing your clothes quietly stops being available.",
      "Your clothes settle into being simply what you are wearing, not something you could alter.",
      "Somewhere between you and your own buttons, a decision gets made without you."
    ],
    // Attempt-time: the moment you actually walk into it.
    "clothing-blocked-attempt": [
      "You reach for a fastening and forget what you were reaching for.",
      "Your hands will not go near your clothes, and you stop wondering why.",
      "The thought of changing slips away before you can hold on to it."
    ],
    "clothing-release": [
      "You could change your clothes, if you wanted to. The idea is available again.",
      "Whatever was standing between you and your clothes quietly isn't.",
      "Your hands remember what they were for."
    ],
    kneel: [
      "Your knees fold sweetly under you before you decide anything.",
      "Down feels right, and something in you is quietly pleased to go there.",
      "You are kneeling. You don't remember choosing to, and you like it here."
    ],
    stand: [
      "You rise, without quite deciding to.",
      "Something lifts you back onto your feet.",
      "You are standing again. The floor lets you go."
    ],
    "kneel-spread": ["You sink to your knees, and they drift apart on their own. It feels right to be open like this."],
    "legs-spread": ["Your feet slide apart. You don't remember deciding to, and you stay that way."],
    "legs-closed": ["Your feet draw together, and they stay there without being asked twice."],
    "all-fours": ["Down onto your hands and knees, and it feels like where you belong."],
    "lie-down": ["You lower yourself to the floor, face down, and the floor holds you."],
    "hands-behind": ["Your hands find each other behind your back and stay clasped there."],
    "arms-behind": ["Your arms fold behind your back, forearms together, as if tied."],
    "elbows-behind": ["Your elbows draw back until they nearly touch. It pulls, and you let it."],
    "arms-up": ["Your arms rise over your head and stay there, light and obedient."],
    "arms-out": ["Your arms lift out to either side and hold, level and steady."],
    "arms-relax": ["Your arms drift back down to your sides. They are yours again."],
    "pose-blocked": ["Your body tries to obey and cannot. Something already holding you won't let it."],
    "speech-block": [
      "You go to answer and find there is nothing to answer with.",
      "The words are there. The way out of your mouth is not.",
      "Speaking stops seeming like something you know how to do."
    ],
    "speech-release": [
      "Your voice is handed back to you.",
      "The way to your own words opens up again.",
      "You could speak now. The thought arrives whole this time."
    ],
    // Suppression flavor leans on absence rather than sensation — the point isn't that it
    // feels different, it's that nothing arrives to be noticed in the first place.
    "awareness-block": [
      "Things are happening to you. None of them seem worth noticing.",
      "Whatever is being done, it stops reaching you somewhere on the way.",
      "You stop keeping track of what is being done to you. It was never important."
    ],
    "awareness-release": [
      "You start noticing what's being done to you again.",
      "The world reattaches itself to your body.",
      "Details you had stopped collecting begin arriving again."
    ],
    // The per-category lines. Clothing and bondage had no wording of their own because they
    // had no suggestion of their own — only touch did — and "you will not notice your
    // clothing" landed on the broad line, which took whatever else was permitted along with
    // it and said the broad thing. Same register as awareness-block: absence, not sensation.
    "clothing-awareness-block": [
      "What you are wearing stops being something you keep track of.",
      "Clothes come and go. It does not seem to be your concern.",
      "Whatever is on you is on you. You stop checking."
    ],
    "clothing-awareness-release": [
      "You notice what you are wearing again.",
      "Your clothes are yours to keep track of once more."
    ],
    "bondage-awareness-block": [
      "Whatever holds you holds you. You stop noticing it being put there.",
      "Rope and leather become part of the furniture.",
      "Restraint arrives without an announcement."
    ],
    "bondage-awareness-release": [
      "You notice what holds you again.",
      "Every knot and buckle reports back."
    ],
    "touch-block": [
      "Hands on you stop registering as anything at all.",
      "You are being touched. The information simply doesn't arrive.",
      "Touch happens somewhere far away from wherever you are."
    ],
    "touch-release": [
      "You can feel where you're being touched again.",
      "Your skin starts reporting back.",
      "Touch reaches you again, arriving where it should."
    ],
    // Numbness is the sensation, not the knowing — so these describe a body that has gone
    // quiet rather than attention that has wandered. The subject can still SEE they are
    // being touched, which is the difference from touch-block above and is deliberate:
    // watching it happen and feeling nothing is the better half of this.
    "numb-block": [
      "You can see it happening. Your body declines to have an opinion about it.",
      "Hands move over you and land on nothing at all.",
      "Somewhere between your skin and you, the message stops being delivered.",
      "You are being touched, and it is happening to somebody else's body."
    ],
    "numb-release": [
      "Your body comes back, all at once, and remembers what it was feeling.",
      "Sensation returns to your skin like warmth to a cold hand.",
      "You can feel again, and everything that was quiet is suddenly not."
    ],
    // Undressing is the most observable thing in the add-on — it changes the character
    // everyone in the room is looking at. These read as the hands acting first and the
    // intention arriving late, same register as the rest, but they are not secrets.
    undress: [
      "Your hands find the fastening before you've decided anything, and go willingly.",
      "It comes off easy, and some warm, unhurried part of you is glad to be seen.",
      "Taking it off feels like the obvious, pleasant thing to have been doing."
    ],
    "undress-all": [
      "Your hands work without consulting you, unhurried, until there is nothing left to bare.",
      "Piece by piece it goes, and none of it feels like a decision \u2014 only something easy and warm.",
      "You undress the way you would sink into a habit \u2014 thorough, dreamy, glad to."
    ],
    "undress-bare": [
      "Your hands go looking for something to take off and find nothing there.",
      "There is nothing left to remove. Your hands settle again."
    ],
    "undress-blocked": [
      "Your hands try, and something holds them where they are.",
      "You go to undress and find you cannot \u2014 something else has that decision."
    ],
    // Deliberately worded like selftouch-frozen's third line, because it is the same fact:
    // you were told to do something with your hands and your hands are not yours right now.
    "undress-frozen": [
      "Undressing would require moving, and you cannot move at all.",
      "You are told to undress. Nothing of yours so much as shifts."
    ],
    // Deliberately says nothing about triggers, and never names one. The subject is not told
    // what almost happened — that is the whole of what a trigger keeps back — only that
    // something reached for them and did not arrive.
    "trigger-ghost": [
      "Something in you turns over, faintly, and settles again.",
      "A word goes past you and almost catches. Almost.",
      "For a moment you were about to do something. The moment goes."
    ],
    "trigger-reinforced": [
      "Something already inside you is gone over again, and set more firmly.",
      "You do not know what was just deepened. It was deepened all the same."
    ],
    "selftouch-frozen": [
      "Your hand doesn't move. Nothing of yours does.",
      "You go to reach for yourself and find nothing answers.",
      "Reaching would require moving, and you cannot move at all."
    ],
    "selftouch-blocked": [
      "Your hands stay exactly where they are, however much you would like them not to.",
      "You want to touch yourself \u2014 and your hands stay put, and the wanting only sharpens.",
      "Touching yourself isn't among the things you're allowed right now, and the ache of that is its own reward."
    ],
    "selftouch-applied": [
      "Reaching for yourself quietly stops being one of your options, and part of you thrills at that.",
      "Something closes off between you and your own hands, and leaves the wanting nowhere to go.",
      "You will not be touching yourself. The decision is already made, it was not yours, and you find you don't mind."
    ],
    // DW's wording, near enough: a restriction lands and the subject finds the not-knowing
    // interesting rather than alarming. It has to stay vague — a trigger fires with no
    // spoken instruction, so naming the part would hand them what the trigger does.
    "restriction-settles": [
      "You feel something close off. You are not sure what yet, and the not-knowing is oddly interesting.",
      "A small door shuts somewhere in you. You will find out which one when you reach for it.",
      "Something has been put out of your reach. You will discover what when your hands get there."
    ],
    "selftouch-part-release": [
      "Your hands are your own again, all of you within reach.",
      "Whatever was keeping you from yourself lets go."
    ],
    // Arousal flavor keeps the same register as the rest: the body reacts first and the
    // subject finds out afterwards. Going DOWN is written as something being taken away
    // rather than as relief, so no direction of this reads as the subject's own doing.
    "arousal-none": [
      "Whatever was building in you is simply put down somewhere you cannot reach.",
      "The heat goes out of you. You don't remember wanting anything.",
      "Your body cools, and takes the wanting with it."
    ],
    "arousal-light": [
      "A slow warmth curls low in you and gets comfortable, like it means to stay.",
      "A small heat starts up somewhere, uninvited and not unwelcome.",
      "You catch yourself wanting, and you don't remember when that started."
    ],
    "arousal-high": [
      "The wanting floods in all at once, and suddenly nothing in the room exists but how much you want it.",
      "Your body goes suddenly, shamelessly desperate, and no part of that was your idea.",
      "Heat climbs through you faster than you can have an opinion about it, and you stop trying to."
    ],
    "arousal-full": [
      "You are right at the edge, trembling, and something is holding you there.",
      "Everything in you is gathered and waiting, aching, one word from going over.",
      "You are so close it hurts, and going the rest of the way is not up to you \u2014 and oh, you want it to be."
    ],
    "orgasm-force": [
      "You go over, because you were told to, and the relief of not choosing is its own sweetness.",
      "Your body obeys before you understand what it was asked, and it feels wonderful to.",
      "It takes you, and you let it, because letting it was never the question."
    ],
    "orgasm-deny": [
      "The way over closes quietly, and you accept that it is closed \u2014 even as you strain toward it.",
      "You can get close, deliciously close, and no further, and you find you don't argue.",
      "Finishing stops being one of the things available to you, and the wanting just pools and stays."
    ],
    "orgasm-allow": [
      "The way over is open again, warm and waiting, whenever you're offered it.",
      "Something unlocks low in you, eager, and you could finish now.",
      "Whatever was standing in the way steps aside, and your body knows it at once."
    ],
    "orgasm-held": [
      "You reach the very edge, and it will not let you over. You stay there, aching.",
      "Everything tips toward release, and the way over stays shut.",
      "You get right to the brink and hang there, as you were told you would."
    ],
    "orgasm-refused": [
      "You strain for it, right to the edge, and something holds you back. Nothing gives.",
      "You are told to go over, and you cannot \u2014 the wanting only builds with nowhere to go.",
      "Your body reaches for it, finds the way shut, and hangs there aching."
    ],
    // The illusion's flavor has one job the others don't: it must not describe a CHANGE,
    // because the subject is supposed to believe nothing has changed. So it reads as
    // attention sliding off the question rather than as anything being done.
    "illusion-block": [
      "You stop wondering what you have on. You know what you have on.",
      "Looking down settles nothing and you lose interest in looking again.",
      "However you are dressed is however you are dressed. The question closes."
    ],
    "illusion-release": [
      "You look down, properly this time, and see what is actually there.",
      "Your eyes finally land on yourself, and the answer is not the one you were carrying.",
      "Whatever was smoothing the question over lets go of it."
    ],
    // Deliberately plain rather than in-fiction: this one is a mismatch between the
    // hypnotist's expectation and the player's own settings, and dressing that up as
    // atmosphere would leave both of them confused about why nothing happened.
    "arousal-unavailable": [
      "Nothing reaches you there \u2014 your arousal meter is switched off in BC's preferences."
    ],
    // Short and repeatable — this one fires on every attempt, so it can't be a paragraph.
    "speech-blocked-attempt": [
      "The words don't come.",
      "Nothing comes out.",
      "Your mouth doesn't cooperate.",
      "The thought dissolves before it reaches your lips."
    ]
  };
  function pick(options) {
    return options[Math.floor(Math.random() * options.length)];
  }
  function flavor(key) {
    return pick(LINES[key]);
  }
  function publicFlavor(key) {
    const options = PUBLIC_LINES[key];
    return options ? fillTokens(pick(options)) : null;
  }
  function announce(key) {
    tellPlayer(flavor(key));
    const seen = publicFlavor(key);
    if (seen) tellRoom(seen);
  }
  function announceBodyPartApplied(part) {
    tellPlayer(
      pick([
        `Touching your ${part} stops being one of the things you are going to do.`,
        `Your ${part} quietly moves out of your own reach.`,
        `You will be leaving your ${part} alone now, and you do not mind.`
      ])
    );
  }
  function announceBodyPart(part) {
    tellPlayer(bodyPartFlavor(part));
    tellRoom(
      fillTokens(
        pick([
          `{name} reaches for {their} ${part}, then seems to change {their} mind.`,
          `{name} half-reaches for {their} ${part} and loses interest partway.`,
          `{name}'s hands get as far as {their} ${part} before drifting away.`
        ])
      )
    );
  }
  function bodyPartFlavor(part) {
    const options = [
      `Your hands move towards your ${part}, then you change your mind. You do not need to touch them.`,
      `You reach for your ${part} and lose interest halfway there.`,
      `Touching your ${part} stops seeming like something you were going to do.`,
      `Your hands get as far as your ${part} before forgetting why.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  function announceInductionBegin() {
    tellRoom(
      fillTokens(
        pick([
          "{name}'s eyes soften and go distant as a low voice draws {their} attention in.",
          "{name} goes quiet and still, {their} whole focus narrowing to a single voice.",
          "{name}'s gaze drifts, catches, and settles on something the rest of the room cannot hear."
        ])
      )
    );
  }
  function inductionMissLine() {
    return pick([
      "The attempt doesn't quite land.",
      "Something in you almost gives, and then doesn't.",
      "The pull thins out before it reaches anything.",
      "For a moment it nearly catches. The moment passes.",
      "You feel the shape of it, and stay exactly where you are."
    ]);
  }
  function inductionSpentLine() {
    return pick([
      "The attempt fades. You feel clear-headed, and harder to reach for a while.",
      "Whatever was reaching for you lets go. Your head is your own, and stays that way a while.",
      "It ebbs away and does not come back. You feel steadier, and less easy to move."
    ]);
  }
  function announceInductionMiss() {
    tellRoom(
      fillTokens(
        pick([
          "{name}'s eyes flutter, drift, and then find the room again.",
          "Something almost settles over {name}, and then lifts.",
          "{name} sways a little, blinks, and the distance goes out of {their} gaze.",
          "For a breath {name} is somewhere else. Then {name} isn't."
        ])
      )
    );
  }
  function hypnotistMissFlavor(subject) {
    return pick([
      `${subject} almost goes, and doesn't.`,
      `Something in ${subject} nearly gives way, then settles.`,
      `It reaches ${subject} and slides off.`,
      `${subject} wavers for a moment, and stays put.`
    ]);
  }
  function announceTranceEnter() {
    tellRoom(
      fillTokens(
        pick([
          "{name}'s eyes slip half-closed, and {their} whole body lets go.",
          "Something in {name} gives way, and the tension goes out of {them}, soft and unhurried.",
          "{name} sinks, breath slowing, wearing the loose calm of someone gone well under."
        ])
      )
    );
  }
  function tranceExpiryLine() {
    return pick([
      "The trance thins out on its own, and you surface slowly.",
      "Whatever was holding you under loosens by itself, and the room comes back.",
      "The calm drains away of its own accord, and your head is your own again."
    ]);
  }
  function announceTranceExpiry() {
    tellRoom(
      fillTokens(
        pick([
          "{name} blinks slowly, and the distance goes out of {their} eyes as the trance wears off.",
          "The looseness drains out of {name} by degrees, and {name} surfaces on {their} own.",
          "{name} stirs and draws a longer breath, the trance having quietly run its course."
        ])
      )
    );
  }
  function hypnotistExpiryFlavor(subject) {
    return pick([
      `${subject} comes up out of the trance unprompted.`,
      `The trance lets go of ${subject} by itself.`,
      `${subject} drifts back up out of trance.`
    ]);
  }

  // src/storage.ts
  var import_lz_string = __toESM(require_lz_string());

  // src/curve.ts
  var H_TRUST = 25;
  var H_EXPERIENCE = 25;
  function valueFromCount(count, h) {
    const n = Math.max(0, count);
    return 100 * n / (n + h);
  }
  function countFromValue(value, h) {
    const v = Math.max(0, Math.min(99.9, value));
    return h * v / (100 - v);
  }

  // src/trust.ts
  var RATE_LIMIT_MS = 5 * 6e4;
  var DIRECTED_MULTIPLIER = 2;
  var INDUCTION_INTERACTIONS = 5;
  var ATTEMPT_EXPERIENCE = 0.25;
  var INDUCTION_EXPERIENCE = 1;
  var lastCounted = /* @__PURE__ */ new Map();
  function noteConversation(sender, senderName, directed) {
    if (!sender || typeof Player?.MemberNumber !== "number" || sender === Player.MemberNumber) return;
    const now = Date.now();
    const last = lastCounted.get(sender) ?? 0;
    if (now - last < RATE_LIMIT_MS) return;
    lastCounted.set(sender, now);
    const gain = directed ? DIRECTED_MULTIPLIER : 1;
    const entry = addInteractions(sender, senderName, gain);
    log(
      `trust +${gain} with ${entry.memberName} (${directed ? "directed" : "ambient"}) \u2192 ${entry.interactions.toFixed(1)} interactions = ${valueFromCount(entry.interactions, H_TRUST).toFixed(1)}`
    );
  }
  function noteInductionAttempt() {
    const exp = addExperience(ATTEMPT_EXPERIENCE);
    log(`attempt experience +${ATTEMPT_EXPERIENCE} \u2192 ${exp.toFixed(1)}`);
  }
  function noteInductionSuccess(hypnotistId, hypnotistName) {
    const entry = addInteractions(hypnotistId, hypnotistName, INDUCTION_INTERACTIONS);
    const exp = addExperience(INDUCTION_EXPERIENCE);
    log(
      `induction accelerator: +${INDUCTION_INTERACTIONS} interactions with ${entry.memberName} \u2192 trust ${trustWith(hypnotistId).toFixed(1)}; experience \u2192 ${exp.toFixed(1)}`
    );
  }
  function agoText(timestamp) {
    if (!timestamp) return "never";
    const mins = Math.floor((Date.now() - timestamp) / 6e4);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
  var RELATIONS = {
    friend: { kind: "friend", floor: 15, reaches: ["session"] },
    lover: { kind: "lover", floor: 30, reaches: ["session", "arousal"] },
    owner: { kind: "owner", floor: 65, reaches: ["session", "arousal", "deceptive", "persistent"] }
  };
  function characterFor(memberId) {
    return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find(
      (c) => c?.MemberNumber === memberId
    );
  }
  function relationshipWith(memberId) {
    const override = getRelationshipOverride(memberId);
    if (override) return override;
    const C = characterFor(memberId);
    try {
      if (C && Player?.IsOwnedByCharacter?.(C)) return "owner";
      if (C && C.IsLoverOfCharacter?.(Player)) return "lover";
      if (Player?.FriendList?.includes?.(memberId)) return "friend";
    } catch {
    }
    return "none";
  }
  function accessFor(memberId, category) {
    const earned = trustWith(memberId);
    const kind = relationshipWith(memberId);
    if (kind === "none") return earned;
    const relation = RELATIONS[kind];
    if (!relation.reaches.includes(category)) return earned;
    return Math.max(earned, relation.floor);
  }
  function describeRelationship(memberId) {
    const kind = relationshipWith(memberId);
    if (kind === "none") return "no BC relationship";
    const r = RELATIONS[kind];
    const pretend = getRelationshipOverride(memberId) ? " (test override)" : "";
    return `${kind}${pretend} \u2014 floor ${r.floor}, reaches ${r.reaches.join(", ")}`;
  }
  function trustStatRows() {
    return listTrust().slice().sort((a, b) => b.interactions - a.interactions).map((t) => ({
      name: `${t.memberName} [${t.memberId}]`,
      trust: trustWith(t.memberId).toFixed(1),
      detail: `${t.interactions.toFixed(1)} interactions \xB7 ${agoText(t.lastUpdated)}`
    }));
  }
  function describeTrust() {
    const all = listTrustRaw();
    const header = `experience: ${experienceValue().toFixed(1)} | you are #${Player?.MemberNumber ?? "unknown"} | this list is RAW: the Stats tab hides the rows marked below`;
    if (!all.length) return [header, "no trust data stored yet"];
    return [
      header,
      ...all.slice().sort((a, b) => b.interactions - a.interactions).map((t) => {
        const self = typeof Player?.MemberNumber === "number" && t.memberId === Player.MemberNumber;
        const hidden = self ? "  <- YOU (hidden, purged on next load)" : t.interactions <= 0 ? "  <- worn out (hidden)" : "";
        return `${t.memberName} [${t.memberId}]: trust ${trustWith(t.memberId).toFixed(1)} (${t.interactions.toFixed(1)} interactions)${hidden}`;
      })
    ];
  }

  // src/timers.ts
  var timers = /* @__PURE__ */ new Map();
  var deadlines = /* @__PURE__ */ new Map();
  function scheduleTimer(key, delayMs, fn) {
    cancelTimer(key);
    deadlines.set(key, Date.now() + delayMs);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        deadlines.delete(key);
        fn();
      }, delayMs)
    );
  }
  function timerDeadline(key) {
    return deadlines.get(key) ?? 0;
  }
  function cancelTimer(key) {
    const existing = timers.get(key);
    if (existing) {
      clearTimeout(existing);
      timers.delete(key);
    }
    deadlines.delete(key);
  }
  var activeKeys = /* @__PURE__ */ new Set();
  function markActive(key) {
    activeKeys.add(key);
  }
  function clearActive(key) {
    activeKeys.delete(key);
  }
  function isActive(key) {
    return activeKeys.has(key);
  }
  function clearAllTimers() {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    deadlines.clear();
    activeKeys.clear();
  }

  // src/teardown.ts
  var cleanups = /* @__PURE__ */ new Set();
  function onTeardown(cleanup) {
    cleanups.add(cleanup);
  }
  function runTeardown() {
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch {
      }
    }
  }

  // src/depth.ts
  var DEPTH_TIERS = [
    { key: "drifting", label: "Drifting", min: 0, blurb: "barely under, still mostly present" },
    { key: "yielding", label: "Yielding", min: 20, blurb: "noticeably affected, starting to respond" },
    { key: "entranced", label: "Entranced", min: 40, blurb: "clearly hypnotized, suggestions land" },
    { key: "deep", label: "Deep", min: 60, blurb: "will faded, limited self-direction" },
    { key: "blank", label: "Blank", min: 80, blurb: "fully gone, complete receptivity" }
  ];
  function tierOf(depth) {
    let found = "drifting";
    for (const t of DEPTH_TIERS) if (depth >= t.min) found = t.key;
    return found;
  }
  function tierMinimum(tier) {
    return DEPTH_TIERS.find((t) => t.key === tier)?.min ?? 0;
  }
  function tierLabel(tier) {
    return DEPTH_TIERS.find((t) => t.key === tier)?.label ?? String(tier);
  }
  function nextTier(tier) {
    const at = DEPTH_TIERS.findIndex((t) => t.key === tier);
    return DEPTH_TIERS[(at + 1) % DEPTH_TIERS.length].key;
  }
  var CHEMICAL_SCOPES = [
    { key: "both", label: "Arousal + drugs" },
    { key: "arousal", label: "Arousal only" },
    { key: "drugs", label: "Drugs only" },
    { key: "none", label: "Neither" }
  ];
  function nextScope(scope) {
    const at = CHEMICAL_SCOPES.findIndex((s) => s.key === scope);
    return CHEMICAL_SCOPES[(at + 1) % CHEMICAL_SCOPES.length].key;
  }
  function arousalCounts() {
    try {
      const scope = getChemicalScope();
      return scope === "both" || scope === "arousal";
    } catch {
      return true;
    }
  }
  var depthFull = 0;
  var depthEarned = 0;
  function setCurrentDepths(full, earned) {
    depthFull = full;
    depthEarned = Math.min(full, earned);
  }
  function clearCurrentDepths() {
    depthFull = 0;
    depthEarned = 0;
  }
  function currentDepth() {
    return depthFull;
  }
  function currentDepthEarned() {
    return depthEarned;
  }
  var DEPTH_GATES = [
    // Mood: noticing less is the shallowest thing hypnosis does.
    { key: "suppressClothing", label: "Not noticing clothing changes", tier: "drifting", earnedOnly: false },
    { key: "suppressBondage", label: "Not noticing bondage changes", tier: "drifting", earnedOnly: false },
    { key: "suppressActivities", label: "Not noticing touches", tier: "drifting", earnedOnly: false },
    // Behavioural, session-only.
    { key: "movementRestriction", label: "Cannot move", tier: "yielding", earnedOnly: false },
    { key: "speechRestriction", label: "Cannot speak", tier: "yielding", earnedOnly: false },
    { key: "postureControl", label: "Posture Control", tier: "yielding", earnedOnly: false },
    { key: "clothingRestriction", label: "Cannot reach the wardrobe", tier: "yielding", earnedOnly: false },
    { key: "selfTouchControl", label: "Cannot touch yourself", tier: "yielding", earnedOnly: false },
    { key: "compelActivity", label: "Made to act (on yourself or others)", tier: "yielding", earnedOnly: false },
    // Deeper, still session-only.
    { key: "followControl", label: "Follow / leash", tier: "entranced", earnedOnly: false },
    { key: "undressControl", label: "Undressing", tier: "entranced", earnedOnly: false },
    { key: "arousalControl", label: "Arousal & orgasm", tier: "entranced", earnedOnly: false },
    // The earned-only three: two outlive the session, one lies to the subject.
    { key: "illusionControl", label: "Clothing illusion", tier: "deep", earnedOnly: true },
    { key: "triggerControl", label: "Planting triggers", tier: "deep", earnedOnly: true },
    { key: "carryForward", label: "Suggestions that outlive the trance", tier: "deep", earnedOnly: true }
  ];
  function gateFor(key) {
    return DEPTH_GATES.find((g) => g.key === key);
  }
  var CHEMICAL_TOGGLEABLE = /* @__PURE__ */ new Set(["illusionControl", "triggerControl"]);
  function isChemicalToggleable(key) {
    const g = gateFor(key);
    return !!g && g.earnedOnly && CHEMICAL_TOGGLEABLE.has(key);
  }
  function effectiveEarnedOnly(key) {
    const g = gateFor(key);
    if (!g || !g.earnedOnly) return false;
    if (!CHEMICAL_TOGGLEABLE.has(key)) return true;
    try {
      return !getChemicalReach(key);
    } catch {
      return true;
    }
  }
  function requiredTier(key) {
    try {
      const override = getDepthOverride(key);
      if (override && DEPTH_TIERS.some((t) => t.key === override)) return override;
    } catch {
    }
    return gateFor(key)?.tier ?? "drifting";
  }
  function requiredDepth(key) {
    return tierMinimum(requiredTier(key));
  }
  function depthAllows(key, full = currentDepth(), earned = currentDepthEarned()) {
    const gate = gateFor(key);
    if (!gate) return true;
    const have = effectiveEarnedOnly(key) ? earned : full;
    return have >= requiredDepth(key);
  }
  function depthRefusal(key, full = currentDepth(), earned = currentDepthEarned()) {
    if (depthAllows(key, full, earned)) return null;
    const need = requiredTier(key);
    const earnedGate = effectiveEarnedOnly(key);
    const have = earnedGate ? earned : full;
    return `needs ${tierLabel(need)} (${requiredDepth(key)}), at ${have.toFixed(0)}${earnedGate ? " earned \u2014 arousal does not count toward this one" : ""}`;
  }

  // src/illusion.ts
  var SHADOW_ID = "HypnosisAddonIllusion";
  var NAME_FIELDS = ["Name", "Nickname", "LabelColor"];
  var COSMETIC_GROUPS = /* @__PURE__ */ new Set(["EyeShadow", "Decals"]);
  function isWornGroup(group) {
    if (!group) return false;
    if (COSMETIC_GROUPS.has(group.Name)) return false;
    return group.Clothing === true || group.Category === "Item";
  }
  var shadow = null;
  var frozen = null;
  var lastSignature = "";
  function isIllusionActive() {
    return frozen !== null;
  }
  function cloneItem(item) {
    return {
      ...item,
      Property: item?.Property ? { ...item.Property } : item?.Property,
      Color: Array.isArray(item?.Color) ? [...item.Color] : item?.Color
    };
  }
  function ensureShadow() {
    if (shadow) return shadow;
    try {
      shadow = CharacterLoadSimple(SHADOW_ID);
    } catch (err) {
      warn("could not create the illusion character:", err);
      return null;
    }
    return shadow;
  }
  function liveSignature() {
    const parts = [String(Player?.ActivePose ?? "")];
    for (const item of Player?.Appearance ?? []) {
      if (isWornGroup(item?.Asset?.Group)) continue;
      parts.push(
        `${item?.Asset?.Group?.Name}:${item?.Asset?.Name}:${item?.Property?.Expression ?? ""}:${String(item?.Color ?? "")}`
      );
    }
    return parts.join("|");
  }
  function rebuild() {
    const target = ensureShadow();
    if (!target || !frozen) return;
    target.AssetFamily = Player?.AssetFamily ?? "Female3DCG";
    target.ActivePose = Player?.ActivePose ?? [];
    target.Appearance = [
      ...(Player?.Appearance ?? []).filter((i) => !isWornGroup(i?.Asset?.Group)),
      ...frozen
    ];
    CharacterRefresh(target, false, false);
    lastSignature = liveSignature();
  }
  function rebuildIfStale() {
    if (liveSignature() !== lastSignature) rebuild();
  }
  function freezeAppearance() {
    if (!Array.isArray(Player?.Appearance)) {
      warn("cannot freeze appearance \u2014 no player appearance yet");
      return false;
    }
    if (frozen) {
      log("clothing illusion already running \u2014 keeping the original snapshot");
      return true;
    }
    frozen = Player.Appearance.filter((i) => isWornGroup(i?.Asset?.Group)).map(cloneItem);
    rebuild();
    log(`clothing illusion applied \u2014 ${frozen.length} worn item(s) frozen`);
    return true;
  }
  function clearIllusion() {
    if (!frozen) return;
    frozen = null;
    lastSignature = "";
    try {
      if (typeof CharacterRefresh === "function") CharacterRefresh(Player, false, false);
    } catch (err) {
      warn("could not refresh after releasing the illusion:", err);
    }
    log("clothing illusion released");
  }
  function illusionSnapshot() {
    if (!frozen) return null;
    return frozen.map((i) => ({
      group: i?.Asset?.Group?.Name,
      name: i?.Asset?.Name,
      color: i?.Color,
      property: i?.Property
    }));
  }
  function restoreIllusion(items) {
    if (!items?.length) return false;
    if (typeof AssetGet !== "function") return false;
    const family = Player?.AssetFamily ?? "Female3DCG";
    const rebuilt = [];
    for (const item of items) {
      const asset = AssetGet(family, item.group, item.name);
      if (!asset) {
        warn(`cannot restore illusion \u2014 asset ${item.group}/${item.name} not found`);
        return false;
      }
      rebuilt.push({ Asset: asset, Color: item.color, Property: item.property });
    }
    frozen = rebuilt;
    lastSignature = "";
    rebuild();
    log(`clothing illusion restored \u2014 ${rebuilt.length} remembered item(s)`);
    return true;
  }
  function describeIllusion() {
    if (!frozen) return "clothing illusion: off";
    const names = frozen.map((i) => i?.Asset?.Group?.Name).filter(Boolean);
    return `clothing illusion: ON, frozen groups: ${names.join(", ") || "(nothing worn)"}`;
  }
  function installIllusion(modApi2) {
    modApi2.hookFunction(
      "DrawCharacter",
      10,
      ((args, next) => {
        try {
          if (!frozen || args[0] !== Player) return next(args);
          const target = ensureShadow();
          if (!target) return next(args);
          rebuildIfStale();
          const realIsPlayer = target.IsPlayer;
          const lent = NAME_FIELDS.map((k) => target[k]);
          target.IsPlayer = () => true;
          for (const k of NAME_FIELDS) target[k] = Player?.[k];
          try {
            return next([target, ...args.slice(1)]);
          } finally {
            target.IsPlayer = realIsPlayer;
            NAME_FIELDS.forEach((k, i) => target[k] = lent[i]);
          }
        } catch (err) {
          warn("illusion draw failed:", err);
          return next(args);
        }
      })
    );
    log("clothing illusion hook installed on DrawCharacter");
  }

  // src/arousal.ts
  var AROUSAL_LEVELS = {
    none: 0,
    light: 30,
    high: 70,
    full: 95
  };
  function arousalAvailable() {
    const settings = Player?.ArousalSettings;
    return !!settings && settings.Active !== "Inactive";
  }
  function setArousalLevel(level) {
    if (!arousalAvailable()) {
      log(`arousal suggestion ignored \u2014 the player's arousal meter is set to Inactive`);
      return false;
    }
    const target = AROUSAL_LEVELS[level];
    ActivitySetArousal(Player, target);
    const settings = Player.ArousalSettings;
    const orgasming = typeof settings.OrgasmTimer === "number" && settings.OrgasmTimer > CurrentTime;
    if (!orgasming && (settings.AffectExpression == null || settings.AffectExpression)) {
      ActivityExpression(Player, target);
    }
    log(`arousal set to ${level} (${target})`);
    return true;
  }
  function forceOrgasm() {
    if (!arousalAvailable()) return "unavailable";
    const settings = Player.ArousalSettings;
    const before = typeof settings.OrgasmTimer === "number" ? settings.OrgasmTimer : 0;
    if (before > CurrentTime) return "already";
    ActivityOrgasmPrepare(Player);
    const after = typeof settings.OrgasmTimer === "number" ? settings.OrgasmTimer : 0;
    if (after <= before) {
      log("forced orgasm refused \u2014 denial, edging, or a chastity item is in the way");
      return "denied";
    }
    ActivityOrgasmStart(Player);
    log("forced orgasm");
    return "orgasm";
  }
  function setOrgasmDenied(denied) {
    deniedByUs = denied;
    if (denied) applyEffect("DenialMode");
    else removeEffect("DenialMode");
    log(`orgasm denial ${denied ? "applied" : "released"}`);
  }
  function clearOrgasmDenial() {
    deniedByUs = false;
    removeEffect("DenialMode");
  }
  var deniedByUs = false;
  function orgasmDeniedByUs() {
    return deniedByUs || hasOwnEffect("DenialMode");
  }
  function denialCarrierLost() {
    return deniedByUs && !hasOwnEffect("DenialMode");
  }

  // src/follow.ts
  var LEASH_EFFECT = "Leash";
  var followActive = false;
  var followTarget = null;
  function applyFollow(leader) {
    followActive = true;
    followTarget = leader;
    applyEffect(LEASH_EFFECT);
    log(`follow compulsion on, leader ${leader ?? "unknown"}`);
  }
  function releaseFollow() {
    const had = followActive || hasOwnEffect(LEASH_EFFECT);
    removeEffect(LEASH_EFFECT);
    try {
      if (typeof ChatRoomLeashPlayer !== "undefined" && ChatRoomLeashPlayer != null && followTarget != null && ChatRoomLeashPlayer === followTarget) {
        ChatRoomLeashPlayer = null;
        if (typeof CharacterRefreshLeash === "function") CharacterRefreshLeash(Player);
      }
    } catch (err) {
      warn("follow: could not clear leash state", err);
    }
    followActive = false;
    followTarget = null;
    if (had) log("follow compulsion off");
  }
  var clearFollow = releaseFollow;
  function installFollow(modApi2) {
    modApi2.hookFunction("ChatRoomDoHoldLeash", 10, (args, next) => {
      const sender = args?.[0];
      if (followActive && followTarget != null && sender?.MemberNumber !== followTarget) {
        log(`follow: refused leash grab by ${sender?.MemberNumber} \u2014 only ${followTarget} may lead`);
        try {
          ServerSend("ChatRoomChat", { Content: "RemoveLeash", Type: "Hidden", Target: sender?.MemberNumber });
          if (typeof CharacterRefreshLeash === "function") CharacterRefreshLeash(Player);
        } catch (err) {
          warn("follow: could not refuse leash grab", err);
        }
        return void 0;
      }
      return next(args);
    });
  }

  // src/recovery.ts
  var RECOVERY_WINDOW_MS = 5 * 6e4;
  var WAIT_POLL_MS = 3e3;
  var STARTUP_POLL_MS = 250;
  var NO_ROOM_FALLBACK_MS = 2e4;
  var GIVE_UP_MS = 12e4;
  var OUR_EFFECTS = ["Freeze", "BlockWardrobe", "DenialMode", "Leash"];
  function stateKey() {
    const member = Player?.MemberNumber;
    return typeof member === "number" && member > 0 ? `HypnosisAddon_Session_${member}` : null;
  }
  function read() {
    const key = stateKey();
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      warn("could not read saved session:", err);
      return null;
    }
  }
  function clearSaved() {
    const key = stateKey();
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
  function persist(state) {
    const key = stateKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify({ ...state, savedAt: Date.now() }));
    } catch (err) {
      warn("could not save session state:", err);
    }
  }
  function snapshotLocalState() {
    const suppressed = ["clothing", "bondage", "activity"].filter(
      (c) => isSuppressed(c)
    );
    return {
      speechBlocked: isSpeechBlocked(),
      screenFade: getScreenFade(),
      suppressed,
      numb: isNumb(),
      selfTouch: selfTouchSnapshot(),
      illusion: illusionSnapshot(),
      effects: OUR_EFFECTS.filter((e) => hasOwnEffect(e)),
      pose: suggestedPose()
    };
  }
  function releaseEverything(reason) {
    releaseOurEffects();
    setSpeechBlocked(false);
    setScreenFade(0);
    setSuppressed("clothing", false);
    setSuppressed("bondage", false);
    setSuppressed("activity", false);
    setNumb(false);
    clearSelfTouchBlocks();
    clearIllusion();
    clearSuggestedPose();
    clearSaved();
    log(`recovery: released everything \u2014 ${reason}`);
  }
  function releaseOurEffects() {
    removeEffect("Freeze");
    removeEffect("BlockWardrobe");
    removeEffect("Leash");
    clearOrgasmDenial();
  }
  function hasOrphanedEffects() {
    return hasOwnEffect("Freeze") || hasOwnEffect("BlockWardrobe") || hasOwnEffect("DenialMode") || hasOwnEffect("Leash");
  }
  function describeCurrentState() {
    const st = snapshotLocalState();
    const on = (label, active2, detail = "") => `  ${active2 ? "ON " : "-  "} ${label}${detail && active2 ? ` (${detail})` : ""}`;
    const body2 = [
      on("frozen", hasOwnEffect("Freeze")),
      on("wardrobe blocked", hasOwnEffect("BlockWardrobe")),
      on("orgasm denied", hasOwnEffect("DenialMode")),
      on("leashed to follow", hasOwnEffect("Leash")),
      on("posed by suggestion", !!st.pose, String(st.pose)),
      on("self-touch blocked", st.selfTouch.all || st.selfTouch.groups.length > 0, describeSelfTouchBlocks())
    ];
    const senses = [
      on("cannot speak", st.speechBlocked),
      on("screen faded", st.screenFade > 0, `${Math.round(st.screenFade * 100)}%${isWalkingTrance() ? ", walking trance" : ""}`),
      on("numb to touch", st.numb),
      // "Unaware of clothing" read as "cannot see her own clothes", which is the ILLUSION,
      // a different feature on the line below. These three hide the chat MESSAGE and nothing
      // else — she is not told her shirt came off, but she can still look down. DW read the
      // old wording the other way, which is the wording's fault rather than DW's.
      on("not told about clothing changes", st.suppressed.includes("clothing")),
      on("not told about bondage changes", st.suppressed.includes("bondage")),
      on("not told about touches", st.suppressed.includes("activity")),
      on("clothing illusion (cannot SEE the change)", isIllusionActive(), describeIllusion().replace(/^clothing illusion: (ON, )?/, ""))
    ];
    const anything = [...body2, ...senses].some((l) => l.startsWith("  ON"));
    return [
      anything ? "Currently in force:" : "Nothing is holding you right now.",
      ...anything ? ["body:", ...body2, "perception:", ...senses] : []
    ];
  }
  function describeSavedState() {
    const saved = read();
    if (!saved) return "saved for reconnect: nothing (no trance was running when last written)";
    const age = Math.round((Date.now() - (saved.savedAt || 0)) / 1e3);
    const within = Date.now() - (saved.savedAt || 0) <= RECOVERY_WINDOW_MS;
    return `saved for reconnect: ${age}s old (${within ? "inside" : "PAST"} the ${RECOVERY_WINDOW_MS / 6e4}-minute window), hypnotist ${saved.hypnotistName || saved.hypnotistId}, depth ${saved.depth}, ${saved.triggers?.length ?? 0} trigger(s), ${saved.carried?.length ?? 0} carried${isWaitingForHypnotist() ? " \u2014 WAITING for them to come back" : ""}`;
  }
  var handlers2 = null;
  var waitTimer = null;
  function registerRecoveryHandlers(h) {
    handlers2 = h;
  }
  var triggerSnapshot = null;
  var triggerRestore = null;
  function registerTriggerRecovery(snapshot, restore) {
    triggerSnapshot = snapshot;
    triggerRestore = restore;
  }
  function snapshotTriggers() {
    try {
      return triggerSnapshot?.() ?? [];
    } catch (err) {
      warn("could not snapshot triggers:", err);
      return [];
    }
  }
  function restoreTriggers(saved) {
    let restored = 0;
    for (const t of saved.triggers ?? []) {
      if (t.until && t.until <= Date.now()) continue;
      try {
        triggerRestore?.(t);
        restored += 1;
      } catch (err) {
        warn(`could not restore trigger ${t.key}:`, err);
      }
    }
    return restored;
  }
  function restoreDurable(saved) {
    const triggers = restoreTriggers(saved);
    let carried = 0;
    if (saved.carriedUntil && saved.carriedUntil <= Date.now()) {
      log("recovery: carried suggestions ran out while away, not restoring them");
    } else if (saved.carried?.length) {
      try {
        handlers2?.restoreCarried(saved);
        carried = saved.carried.length;
      } catch (err) {
        warn("could not restore carried suggestions:", err);
      }
    }
    return triggers > 0 || carried > 0;
  }
  function restoreLocalState(saved) {
    setSpeechBlocked(!!saved.speechBlocked);
    setScreenFade(Number(saved.screenFade) || 0);
    for (const c of saved.suppressed ?? []) setSuppressed(c, true);
    setNumb(!!saved.numb);
    restoreSelfTouch(saved.selfTouch ?? { all: false, groups: [] });
    for (const e of saved.effects ?? []) if (!hasOwnEffect(e)) applyEffect(e);
    if (hasOwnEffect("Leash")) applyFollow(null);
    if (saved.pose) restoreSuggestedPose(saved.pose);
    if (saved.illusion?.length) {
      if (!restoreIllusion(saved.illusion)) {
        tellPlayer("Coming back, you catch sight of yourself as you actually are.");
      }
    }
  }
  function startRecovery() {
    const startedAt = Date.now();
    const since = () => Date.now() - startedAt;
    const tick = () => {
      const known = typeof Player?.MemberNumber === "number" && Player.MemberNumber > 0;
      const inRoom = typeof ChatRoomCharacter !== "undefined" && ChatRoomCharacter?.length > 0;
      if (known && inRoom) {
        clearInterval(poll);
        log(`recovery: ${attemptRecovery()}`);
        return;
      }
      if (known && since() > NO_ROOM_FALLBACK_MS) {
        clearInterval(poll);
        log(`recovery (no room): ${attemptRecovery()}`);
        return;
      }
      if (since() > GIVE_UP_MS) {
        clearInterval(poll);
        log("recovery: gave up waiting to learn who we are");
      }
    };
    const poll = setInterval(tick, STARTUP_POLL_MS);
    tick();
  }
  function attemptRecovery() {
    const saved = read();
    if (!saved) {
      if (hasOrphanedEffects()) {
        releaseEverything("effects left over with no session behind them");
        tellPlayer("Something was still holding you from before. It has let go.");
        return "orphans cleared";
      }
      return "nothing to do";
    }
    if (getFeatures().releaseOnDisconnect) {
      releaseEverything("the subject has asked to come back clear after a disconnect");
      tellPlayer("You come back to yourself, clear. Nothing followed you.");
      return "released by setting";
    }
    const away = Date.now() - (saved.savedAt || 0);
    if (!saved.sessionLive) {
      const stranded = hasOrphanedEffects();
      releaseOurEffects();
      const durable = restoreDurable(saved);
      if (durable) {
        tellPlayer("Something that was already true of you is still true.");
        return "durable only";
      }
      clearSaved();
      if (stranded) {
        tellPlayer("Whatever was holding you ran its course while you were away.");
        return "expired";
      }
      return "nothing to do";
    }
    if (away > RECOVERY_WINDOW_MS) {
      releaseEverything(`away ${Math.round(away / 6e4)} min, past the ${RECOVERY_WINDOW_MS / 6e4}-minute window`);
      if (restoreDurable(saved)) {
        tellPlayer("The trance did not survive being away that long. Something else still has not let go.");
      } else {
        tellPlayer("You were gone long enough that whatever held you has ended.");
      }
      return "expired";
    }
    return waitForHypnotist(saved);
  }
  function waitForHypnotist(saved) {
    const resume = () => {
      restoreLocalState(saved);
      restoreTriggers(saved);
      let live = true;
      try {
        live = handlers2?.restoreSession(saved) !== false;
        handlers2?.restoreCarried(saved);
      } catch (err) {
        warn("could not restore the session:", err);
      }
      if (live) tellPlayer("You were gone for a moment. You are still under, and it is as though you never left.");
      log(live ? "recovery: resumed" : "recovery: the trance had run out while away");
    };
    if (saved.hypnotistId && handlers2?.inRoom(saved.hypnotistId)) {
      resume();
      return "resumed";
    }
    tellPlayer(
      `You are still somewhere under. If ${saved.hypnotistName || "they"} is not back within a few minutes, it will fade.`
    );
    restoreLocalState(saved);
    if (waitTimer) clearInterval(waitTimer);
    waitTimer = setInterval(() => {
      const away = Date.now() - (saved.savedAt || 0);
      if (saved.hypnotistId && handlers2?.inRoom(saved.hypnotistId)) {
        stopWaiting();
        resume();
        return;
      }
      if (away > RECOVERY_WINDOW_MS) {
        stopWaiting();
        releaseEverything("the hypnotist did not come back inside the window");
        restoreDurable(saved);
        tellPlayer("They did not come back. Whatever was holding you loosens and lets go.");
      }
    }, WAIT_POLL_MS);
    return "waiting";
  }
  function stopWaiting() {
    if (waitTimer) clearInterval(waitTimer);
    waitTimer = null;
  }
  function isWaitingForHypnotist() {
    return waitTimer !== null;
  }

  // src/carry.ts
  var MAX_CARRIED = 8;
  var TIMER_KEY = "carry-forward";
  var carrier = null;
  var carrierName = "";
  var ids = [];
  var reapplyOne = null;
  var undoOne = null;
  function registerCarryHandlers(reapply, undo) {
    reapplyOne = reapply;
    undoOne = undo;
  }
  var applied = [];
  function noteApplied(id) {
    const at = applied.indexOf(id);
    if (at !== -1) applied.splice(at, 1);
    applied.push(id);
  }
  function noteReleased(id) {
    const at = applied.indexOf(id);
    if (at !== -1) applied.splice(at, 1);
  }
  function appliedSuggestions() {
    return [...applied];
  }
  function lastApplied() {
    return applied.slice(-1);
  }
  function clearActiveSuggestions() {
    applied.length = 0;
  }
  function restoreActiveSuggestions(ids2) {
    applied.length = 0;
    for (const id of ids2 ?? []) applied.push(id);
    if (applied.length) log(`carry: tracker restored \u2014 ${applied.join(", ")}`);
  }
  function isCarried(id) {
    return ids.includes(id);
  }
  function carriedIds() {
    return [...ids];
  }
  function isCarrierOf(sender) {
    return carrier === sender && ids.length > 0;
  }
  function describeCarry() {
    if (!ids.length) return "carry-forward: nothing held";
    return `carry-forward: holding ${ids.join(", ")} (from ${carrierName || carrier})`;
  }
  function carryThese(sender, name, wanted) {
    const features = getFeatures();
    if (!features.hypnoEnabled) return { refusal: "They have hypnosis switched off." };
    if (!features.carryForward) return { refusal: `They have not enabled "Suggestions that outlive the trance".` };
    const refusal = depthRefusal("carryForward");
    if (refusal)
      return { refusal: `Making a suggestion outlive the trance ${refusal}. Take them deeper first.` };
    if (!wanted.length)
      return { refusal: "Nothing to keep \u2014 give the suggestion first, then say it stays with them." };
    if (carrier !== null && carrier !== sender) releaseCarried("someone else took over");
    carrier = sender;
    carrierName = name;
    const added = [];
    for (const id of wanted) {
      if (ids.includes(id)) continue;
      if (ids.length >= MAX_CARRIED) {
        log(`carry-forward is full at ${MAX_CARRIED}, dropping "${id}"`);
        continue;
      }
      ids.push(id);
      added.push(id);
    }
    if (!added.length) return { refusal: "That is already set to stay with them." };
    log(`carry-forward will keep ${added.join(", ")} (${ids.length} total)`);
    return { subject: "Something in what you were just told settles deeper, and stays." };
  }
  function carryThroughWake() {
    if (!ids.length) return null;
    for (const id of ids) {
      try {
        reapplyOne?.(id);
      } catch (err) {
        warn(`carry-forward could not re-apply "${id}":`, err);
      }
    }
    const minutes = getTriggerDuration();
    cancelTimer(TIMER_KEY);
    if (minutes > 0) {
      scheduleTimer(TIMER_KEY, minutes * 6e4, () => {
        releaseCarried("it wore off");
        tellPlayer("Whatever stayed with you out of the trance quietly stops.");
      });
    }
    log(`carry-forward kept ${ids.length} suggestion(s) past waking, for ${minutes || "unlimited"} min`);
    return "You wake up. Something they told you comes with you, and you do not question it.";
  }
  function carrierId() {
    return carrier;
  }
  function carrierNameFor() {
    return carrierName;
  }
  function restoreCarried(savedIds, until, who, whoName) {
    if (!savedIds?.length) return;
    ids = [...savedIds];
    carrier = who;
    carrierName = whoName;
    for (const id of ids) {
      try {
        reapplyOne?.(id);
      } catch (err) {
        warn(`carry-forward could not restore "${id}":`, err);
      }
    }
    cancelTimer(TIMER_KEY);
    const remaining = until ? until - Date.now() : 0;
    if (remaining > 0) {
      scheduleTimer(TIMER_KEY, remaining, () => {
        releaseCarried("it wore off");
        tellPlayer("Whatever stayed with you out of the trance quietly stops.");
      });
    }
    log(`carry-forward restored ${ids.length} suggestion(s), ${remaining > 0 ? `${Math.round(remaining / 6e4)} min left` : "no clock"}`);
  }
  function dropCarried(id) {
    const i = ids.indexOf(id);
    if (i === -1) return;
    ids.splice(i, 1);
    log(`carry-forward let go of "${id}" (${ids.length} left)`);
    if (!ids.length) {
      cancelTimer(TIMER_KEY);
      carrier = null;
      carrierName = "";
    }
  }
  function releaseCarried(reason) {
    cancelTimer(TIMER_KEY);
    if (!ids.length) {
      carrier = null;
      return false;
    }
    for (const id of ids) {
      try {
        undoOne?.(id);
      } catch (err) {
        warn(`carry-forward could not undo "${id}":`, err);
      }
    }
    log(`carry-forward released ${ids.length} suggestion(s) \u2014 ${reason}`);
    ids = [];
    carrier = null;
    carrierName = "";
    return true;
  }

  // src/session.ts
  var PROMPT_TIMEOUT_MS = 6e4;
  var INDUCTION_WINDOW_MS = 6e4;
  var maxAttempts = () => getMaxAttempts();
  var COOLDOWN_MS = 10 * 6e4;
  var SESSION_TIMEOUT_MS = 30 * 6e4;
  var TIMEOUT_MINUTES = Math.round(SESSION_TIMEOUT_MS / 6e4);
  var RESISTANCE_FLOOR = 5;
  var CHANCE_CEILING = 95;
  var EXPERIENCE_WEIGHT = 0.25;
  var STRANGER_CEILING = 30;
  var SKILL_ATTEMPT_CREDIT = 0.25;
  var SKILL_SUCCESS_CREDIT = 1;
  var SELF_WAKE_MAX_DEPTH = 40;
  var CHOICE_MODIFIER = { agree: 25, ignore: 0, fight: -25 };
  var TRANCE_ABSENCE_GRACE_MS = RECOVERY_WINDOW_MS;
  var INDUCTION_ABSENCE_GRACE_MS = 3e4;
  var PRESENCE_POLL_MS = 3e3;
  var RELATION_DEPTH_FLOOR = {
    friend: 0,
    lover: 40,
    // Entranced — arousal, always
    owner: 60
    // Deep — the illusion and triggers, always; Blank still has to be earned
  };
  var RP_BONUS_PER_LINE = 5;
  var RP_BONUS_CAP = 15;
  var RP_MIN_LENGTH = 15;
  function freshSession() {
    return {
      phase: "Idle",
      hypnotistId: null,
      choice: null,
      attempts: 0,
      progress: 0,
      depth: 0,
      depthEarned: 0,
      cooldownUntil: 0,
      hypnotizedAt: 0,
      promptName: "",
      promptExpiresAt: 0,
      rpLines: 0,
      lastRpLine: "",
      honouredSkill: 0
    };
  }
  var session = freshSession();
  var promptTimer = null;
  var windowTimer = null;
  var sessionTimer = null;
  var cooldownTimer = null;
  var hypnotistGoneSince = 0;
  var presenceTimer = null;
  function clearTimers() {
    for (const t of [promptTimer, windowTimer, sessionTimer, cooldownTimer]) if (t) clearTimeout(t);
    promptTimer = windowTimer = sessionTimer = cooldownTimer = null;
    stopPresenceWatch();
  }
  function stopPresenceWatch() {
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = null;
    hypnotistGoneSince = 0;
  }
  function rosterReadable() {
    return typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter) && ChatRoomCharacter.length > 0;
  }
  function memberInRoom(memberId) {
    if (memberId == null) return null;
    if (!rosterReadable()) return null;
    return ChatRoomCharacter.some((c) => c?.MemberNumber === memberId);
  }
  function hypnotistPresentForInduction() {
    return memberInRoom(session.hypnotistId) !== false;
  }
  function notify(message) {
    log(message);
    tellPlayer(message);
  }
  function progressBand(chance) {
    if (chance < 15) return "barely responsive";
    if (chance < 30) return "slightly relaxed";
    if (chance < 50) return "more relaxed";
    return "almost under";
  }
  function depthBand(depth) {
    if (depth < 25) return "lightly under";
    if (depth < 60) return "deeply under";
    return "very deep";
  }
  var sessionEndsAt = 0;
  var PERSIST_HEARTBEAT_MS = 5e3;
  var persistTimer = null;
  function stopPersistHeartbeat() {
    if (persistTimer) clearInterval(persistTimer);
    persistTimer = null;
  }
  function persistState() {
    const live = session.phase === "Hypnotized";
    const carried = carriedIds();
    const triggers = snapshotTriggers();
    if (!live && !carried.length && !triggers.length) {
      stopPersistHeartbeat();
      clearSaved();
      return;
    }
    if (!persistTimer) persistTimer = setInterval(persistState, PERSIST_HEARTBEAT_MS);
    persist({
      ...snapshotLocalState(),
      sessionLive: live,
      hypnotistId: session.hypnotistId,
      hypnotistName: findCharacterName(session.hypnotistId),
      depth: session.depth,
      depthEarned: session.depthEarned,
      sessionEndsAt,
      applied: appliedSuggestions(),
      carried,
      carriedUntil: timerDeadline("carry-forward"),
      carrierId: carrierId(),
      carrierName: carrierNameFor(),
      triggers
    });
  }
  function saveForReconnect() {
    persistState();
  }
  function pushUpdate(refusedReason, ended) {
    if (session.hypnotistId == null) return;
    const now = Date.now();
    sendHiddenMessage(
      {
        type: "session-update",
        phase: session.phase,
        attempts: session.attempts,
        maxAttempts: maxAttempts(),
        // Bands only — never `progress`, `depth`, or `choice` themselves.
        progressBand: session.phase === "AttemptFailed" ? progressBand(session.progress) : null,
        depthBand: session.phase === "Hypnotized" ? depthBand(session.depth) : null,
        cooldownRemaining: Math.max(0, session.cooldownUntil - now),
        windowRemaining: session.phase === "InductionInProgress" ? INDUCTION_WINDOW_MS : 0,
        refusedReason: refusedReason ?? null,
        ended: ended ?? null
      },
      session.hypnotistId
    );
    persistState();
  }
  function refuse(to, reason) {
    sendHiddenMessage(
      {
        type: "session-update",
        phase: session.hypnotistId === to ? session.phase : "Idle",
        attempts: 0,
        maxAttempts: maxAttempts(),
        progressBand: null,
        depthBand: null,
        cooldownRemaining: Math.max(0, session.cooldownUntil - Date.now()),
        windowRemaining: 0,
        refusedReason: reason
      },
      to
    );
  }
  function expireSession(when) {
    endSession(
      when === "away" ? "the trance ran out while you were away" : `the trance ran its full ${TIMEOUT_MINUTES} minutes`,
      false,
      when
    );
  }
  function endSession(reason, quiet = false, expiry) {
    clearTimers();
    const had = session.phase === "Hypnotized";
    const hypnotist = session.hypnotistId;
    removeEffect("Freeze");
    removeEffect("BlockWardrobe");
    clearFollow();
    clearSuggestedPose();
    clearTranceStates();
    clearAllSuppression();
    clearSelfTouchBlocks();
    clearActiveSuggestions();
    clearCurrentDepths();
    stopWaiting();
    clearOrgasmDenial();
    if (!isCarried("illusion-block")) clearIllusion();
    clearAllTimers();
    runTeardown();
    session = freshSession();
    session.hypnotistId = hypnotist;
    pushUpdate(void 0, had && expiry ? "timeout" : void 0);
    session.hypnotistId = null;
    if (!quiet && had && expiry) {
      notify(`${tranceExpiryLine()} (${reason[0].toUpperCase()}${reason.slice(1)}.)`);
      if (expiry === "here") announceTranceExpiry();
    } else if (!quiet) notify(had ? `You come out of trance. (${reason})` : `Hypnosis attempt ended. (${reason})`);
    const carried = carryThroughWake();
    if (carried && !quiet) notify(carried);
  }
  function chemicalFloor() {
    if (!arousalCounts()) return 0;
    const settings = Player?.ArousalSettings;
    const active2 = settings?.Active === "Hybrid" || settings?.Active === "Automatic";
    if (!active2) return 0;
    const progress = typeof settings?.Progress === "number" ? settings.Progress : 0;
    return Math.max(0, Math.min(STRANGER_CEILING, progress));
  }
  function effectiveAccess(memberId) {
    return Math.max(accessFor(memberId, "session"), chemicalFloor());
  }
  function resolveDepths(hypnotistId, choice, roll) {
    const full = inductionChance(hypnotistId, choice);
    const earned = inductionChance(hypnotistId, choice, true);
    const floor = choice === "fight" ? 0 : RELATION_DEPTH_FLOOR[relationshipWith(hypnotistId)] ?? 0;
    const at = (chance) => Math.min(100, Math.max(0, Math.round(Math.max(chance - roll, floor))));
    const fullDepth = at(full);
    return { full: fullDepth, earned: Math.min(fullDepth, at(earned)) };
  }
  var NO_SKILL = { additive: 0, fightFloor: 0 };
  var SKILL_ADDITIVE_WEIGHT = 0.35;
  var SKILL_FIGHT_FLOOR_WEIGHT = 0.25;
  function currentSkillTerms(earnedOnly) {
    if (earnedOnly) return NO_SKILL;
    const v = session.honouredSkill;
    if (!v || v <= 0) return NO_SKILL;
    return { additive: v * SKILL_ADDITIVE_WEIGHT, fightFloor: RESISTANCE_FLOOR + v * SKILL_FIGHT_FLOOR_WEIGHT };
  }
  function honourSkill(rung, claimed, trust) {
    const v = Math.max(0, Math.min(100, claimed));
    const byTrust = v * Math.max(0, Math.min(100, trust)) / 100;
    switch (rung) {
      case "trusted":
        return byTrust;
      case "capped":
        return Math.min(v, STRANGER_CEILING);
      case "floored":
        return Math.max(byTrust, Math.min(v, STRANGER_CEILING));
      case "full":
        return v;
      default:
        return 0;
    }
  }
  function skillDescriptor(honoured) {
    if (honoured < 20) return null;
    if (honoured < 50) return "Something about the way they say your name makes you want to listen.";
    if (honoured < 80) return "Something in their voice puts you faintly off balance, and you are not sure why.";
    return "Something in how they speak to you makes you want to sit down before they ask.";
  }
  function chanceBeforeInvariant(hypnotistId, choice, earnedOnly, skill) {
    const trust = earnedOnly ? accessFor(hypnotistId, "session") : effectiveAccess(hypnotistId);
    const exp = experienceValue();
    const experienceEffect = choice === "agree" ? exp * EXPERIENCE_WEIGHT : choice === "fight" ? -exp * EXPERIENCE_WEIGHT : 0;
    const raw = trust + CHOICE_MODIFIER[choice] + experienceEffect + rpBonusFor(hypnotistId) + skill.additive;
    const floor = choice === "fight" ? Math.max(RESISTANCE_FLOOR, skill.fightFloor) : RESISTANCE_FLOOR;
    return Math.max(floor, Math.min(CHANCE_CEILING, raw));
  }
  function inductionChance(hypnotistId, choice, earnedOnly = false, skill) {
    const terms = skill ?? currentSkillTerms(earnedOnly);
    const chance = chanceBeforeInvariant(hypnotistId, choice, earnedOnly, terms);
    if (choice !== "fight") return chance;
    return Math.min(chance, chanceBeforeInvariant(hypnotistId, "ignore", earnedOnly, terms));
  }
  function rpBonusFor(hypnotistId) {
    if (hypnotistId !== session.hypnotistId) return 0;
    return Math.min(session.rpLines * RP_BONUS_PER_LINE, RP_BONUS_CAP);
  }
  function noteInductionLine(sender, content) {
    if (session.phase !== "InductionInProgress") return;
    if (!sender || sender !== session.hypnotistId) return;
    const text = (content ?? "").trim();
    if (text.length < RP_MIN_LENGTH) return;
    const key = text.toLowerCase();
    if (key === session.lastRpLine) return;
    session.lastRpLine = key;
    session.rpLines += 1;
    log(`induction RP line ${session.rpLines} \u2014 bonus now +${rpBonusFor(sender)}`);
  }
  function describeChances(memberId) {
    const trust = trustWith(memberId);
    const floor = chemicalFloor();
    const access = effectiveAccess(memberId);
    const exp = experienceValue();
    const perSession = (c) => 100 * (1 - Math.pow(1 - c / 100, maxAttempts()));
    return [
      `vs [${memberId}] \u2014 trust ${trust.toFixed(1)}, arousal floor ${floor.toFixed(1)} \u2192 access ${access.toFixed(1)}${floor > trust ? " (arousal carrying it)" : ""}, experience ${exp.toFixed(1)}`,
      `  ${describeRelationship(memberId)}`,
      // Skill only shows when this client honoured some — zero outside an attempt, zero on
      // rung Ignore, zero for a stranger on rung Trusted. It is the HONOURED value, the same
      // one the descriptor reads, not the claim.
      ...session.honouredSkill > 0 ? [`  honoured skill +${(session.honouredSkill * SKILL_ADDITIVE_WEIGHT).toFixed(1)} (they read as ${session.honouredSkill.toFixed(0)}/100 to you)`] : session.phase === "Idle" ? getSkillHonour() === "ignore" ? ["  skill: ignored by your setting \u2014 it never counts against you"] : ["  skill: not counted until someone attempts (your client learns their claim from the attempt itself)"] : [],
      // Only worth a line when there is one, since it is zero outside an induction window —
      // but silence about a live bonus would make the percentages below look wrong.
      ...rpBonusFor(memberId) > 0 ? [`  roleplay bonus +${rpBonusFor(memberId)} (${session.rpLines} line(s) this window)`] : [],
      ...["agree", "ignore", "fight"].map((choice) => {
        const c = inductionChance(memberId, choice);
        return `  ${choice.padEnd(6)} ${c.toFixed(1)}% per attempt, ${perSession(c).toFixed(0)}% across ${maxAttempts()}`;
      })
    ];
  }
  function runInductionRoll() {
    windowTimer = null;
    if (session.phase !== "InductionInProgress" || session.hypnotistId == null) return;
    if (!hypnotistPresentForInduction()) {
      lapseInduction("left before it could land");
      return;
    }
    const choice = session.choice ?? "ignore";
    const chance = inductionChance(session.hypnotistId, choice);
    const roll = Math.random() * 100;
    session.attempts += 1;
    noteInductionAttempt();
    const detail = `chance=${chance.toFixed(1)} roll=${roll.toFixed(1)} choice=${choice} trust=${trustWith(session.hypnotistId).toFixed(1)} exp=${experienceValue().toFixed(1)}`;
    if (roll < chance) {
      session.phase = "Hypnotized";
      const depths = resolveDepths(session.hypnotistId, choice, roll);
      session.depth = depths.full;
      session.depthEarned = depths.earned;
      setCurrentDepths(depths.full, depths.earned);
      session.hypnotizedAt = Date.now();
      sessionEndsAt = Date.now() + SESSION_TIMEOUT_MS;
      sessionTimer = setTimeout(() => expireSession("here"), SESSION_TIMEOUT_MS);
      applyTranceState();
      startPresenceWatch();
      noteInductionSuccess(session.hypnotistId, findCharacterName(session.hypnotistId));
      notify(`You slip under. (${tierLabel(tierOf(session.depth)).toLowerCase()})`);
      announceTranceEnter();
      log(`induction SUCCEEDED: ${detail} depth=${session.depth}`);
    } else if (session.attempts >= maxAttempts()) {
      session.phase = "CooldownRequired";
      session.cooldownUntil = Date.now() + COOLDOWN_MS;
      session.progress = chance;
      scheduleCooldownEnd();
      notify(inductionSpentLine());
      announceInductionMiss();
      log(`induction FAILED (final): ${detail}`);
    } else {
      session.phase = "AttemptFailed";
      session.progress = chance;
      notify(inductionMissLine());
      announceInductionMiss();
      log(`induction failed: ${detail} attempt=${session.attempts}`);
    }
    pushUpdate();
  }
  function scheduleCooldownEnd() {
    if (cooldownTimer) clearTimeout(cooldownTimer);
    cooldownTimer = setTimeout(
      () => {
        cooldownTimer = null;
        if (session.phase !== "CooldownRequired") return;
        const hypnotist = session.hypnotistId;
        session = freshSession();
        if (hypnotist != null) {
          session.hypnotistId = hypnotist;
          pushUpdate();
          session.hypnotistId = null;
        }
        log("cooldown expired \u2014 subject reachable again");
      },
      Math.max(0, session.cooldownUntil - Date.now())
    );
  }
  function forceTrance(hypnotistId, full, earned) {
    if (!isTestingMode()) return "not available outside the testing room";
    if (!getFeatures().hypnoEnabled) return "hypnoEnabled is off \u2014 turn hypnosis on first";
    clearTimers();
    session.phase = "Hypnotized";
    session.hypnotistId = hypnotistId;
    session.depth = Math.max(0, Math.min(100, full));
    session.depthEarned = Math.max(0, Math.min(session.depth, earned));
    setCurrentDepths(session.depth, session.depthEarned);
    session.hypnotizedAt = Date.now();
    sessionEndsAt = Date.now() + SESSION_TIMEOUT_MS;
    sessionTimer = setTimeout(() => expireSession("here"), SESSION_TIMEOUT_MS);
    applyTranceState();
    startPresenceWatch();
    pushUpdate();
    persistState();
    log(`TESTING: forced trance with ${hypnotistId}, depth ${session.depth}/${session.depthEarned}`);
    return null;
  }
  function findCharacterName(memberId) {
    const c = (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find(
      (x) => x?.MemberNumber === memberId
    );
    return c?.Name ?? `#${memberId}`;
  }
  function applyTranceState() {
    const f = getFeatures();
    if (!f.hypnoEnabled) return;
    if (f.tranceCannotMove) applyEffect("Freeze");
    if (f.tranceCannotSpeak) setSpeechBlocked(true);
    if (f.tranceScreenFade) setScreenFade(TRANCE_FADE_OPACITY);
    if (f.tranceClothingFreeze) freezeAppearance();
    log(
      `trance state applied: move=${f.tranceCannotMove} speak=${f.tranceCannotSpeak} fade=${f.tranceScreenFade} clothesFrozen=${f.tranceClothingFreeze}`
    );
  }
  function enterWalkingTrance() {
    if (session.phase !== "Hypnotized") return false;
    if (isWalkingTrance()) return true;
    removeEffect("Freeze");
    if (getFeatures().tranceScreenFade) setScreenFade(WALKING_FADE_OPACITY);
    setWalkingTrance(true);
    notify("You are on your feet, moving \u2014 and still his. Nothing about that feels strange to you.");
    log("walking trance entered");
    return true;
  }
  function leaveWalkingTrance() {
    if (!isWalkingTrance()) return false;
    const f = getFeatures();
    if (f.tranceCannotMove) applyEffect("Freeze");
    if (f.tranceScreenFade) setScreenFade(TRANCE_FADE_OPACITY);
    setWalkingTrance(false);
    notify("You go still, and the world recedes again.");
    log("walking trance left \u2014 full trance restored");
    return true;
  }
  function hypnotistLabel() {
    const id = session.hypnotistId;
    if (id == null) return "They";
    const resolved = findCharacterName(id);
    return resolved.startsWith("#") ? session.promptName || "They" : resolved;
  }
  function lapseInduction(reason) {
    const wasRunning = session.phase === "InductionInProgress";
    const name = hypnotistLabel();
    if (promptTimer) {
      clearTimeout(promptTimer);
      promptTimer = null;
    }
    if (windowTimer) {
      clearTimeout(windowTimer);
      windowTimer = null;
    }
    stopPresenceWatch();
    session.choice = null;
    session.rpLines = 0;
    session.lastRpLine = "";
    session.promptExpiresAt = 0;
    if (session.attempts > 0) {
      session.phase = "AttemptFailed";
      notify(`${name} ${reason}. The attempt ends \u2014 you are no further under, and it still counts as ${session.attempts} of ${maxAttempts()}.`);
      pushUpdate();
    } else {
      session.phase = "Idle";
      notify(`${name} ${reason}. Nothing came of it, and nothing was used up.`);
      pushUpdate();
      session.hypnotistId = null;
      session.promptName = "";
    }
    if (wasRunning) announceInductionMiss();
    log(`induction lapsed: ${reason} (attempts=${session.attempts})`);
  }
  function checkHypnotistPresence() {
    if (session.hypnotistId == null) {
      stopPresenceWatch();
      return;
    }
    const phase = session.phase;
    if (phase !== "AttemptMade" && phase !== "InductionInProgress" && phase !== "Hypnotized") {
      stopPresenceWatch();
      return;
    }
    const here = memberInRoom(session.hypnotistId);
    if (here === null) return;
    if (here) {
      if (hypnotistGoneSince) {
        hypnotistGoneSince = 0;
        notify(`${hypnotistLabel()} is back.`);
      }
      return;
    }
    if (!hypnotistGoneSince) {
      hypnotistGoneSince = Date.now();
      const minutes = Math.round((phase === "Hypnotized" ? TRANCE_ABSENCE_GRACE_MS : INDUCTION_ABSENCE_GRACE_MS) / 6e4);
      notify(
        phase === "Hypnotized" ? `${hypnotistLabel()} is not in the room. If they are not back within ${minutes || 1} minute${minutes === 1 ? "" : "s"}, this ends on its own.` : `${hypnotistLabel()} is not in the room.`
      );
      return;
    }
    const grace = phase === "Hypnotized" ? TRANCE_ABSENCE_GRACE_MS : INDUCTION_ABSENCE_GRACE_MS;
    if (Date.now() - hypnotistGoneSince < grace) return;
    if (phase === "Hypnotized") {
      endSession("they left and did not come back");
    } else {
      lapseInduction("left, and did not come back");
    }
  }
  function startPresenceWatch() {
    hypnotistGoneSince = 0;
    if (presenceTimer) return;
    presenceTimer = setInterval(checkHypnotistPresence, PRESENCE_POLL_MS);
  }
  function beginInductionWindow() {
    if (!hypnotistPresentForInduction()) {
      lapseInduction("is no longer in the room");
      return;
    }
    session.phase = "InductionInProgress";
    announceInductionBegin();
    session.rpLines = 0;
    session.lastRpLine = "";
    if (windowTimer) clearTimeout(windowTimer);
    windowTimer = setTimeout(runInductionRoll, INDUCTION_WINDOW_MS);
    startPresenceWatch();
    pushUpdate();
  }
  function showPrompt(hypnotistName) {
    if (promptTimer) clearTimeout(promptTimer);
    session.promptName = hypnotistName;
    session.promptExpiresAt = Date.now() + PROMPT_TIMEOUT_MS;
    promptTimer = setTimeout(() => {
      promptTimer = null;
      if (session.phase !== "AttemptMade") return;
      session.choice = "ignore";
      notify("You didn't respond \u2014 the induction proceeds without your intent either way.");
      beginInductionWindow();
    }, PROMPT_TIMEOUT_MS);
    startPresenceWatch();
    const descriptor = skillDescriptor(session.honouredSkill);
    notify(
      `${hypnotistName} is attempting to hypnotize you. Choose on the box in the room, or with /hypno agree, /hypno ignore, /hypno fight \u2014 they will not be told which you chose. (${Math.round(PROMPT_TIMEOUT_MS / 1e3)}s)` + (descriptor ? ` ${descriptor}` : "")
    );
  }
  function getPendingPrompt() {
    if (session.phase !== "AttemptMade") return null;
    return {
      hypnotistName: session.promptName || "Someone",
      remainingMs: Math.max(0, session.promptExpiresAt - Date.now()),
      descriptor: skillDescriptor(session.honouredSkill)
    };
  }
  function answerPrompt(raw) {
    const choice = (raw ?? "").trim().toLowerCase();
    if (!["agree", "ignore", "fight"].includes(choice)) {
      notify("usage: /hypno agree | ignore | fight");
      return;
    }
    if (session.phase !== "AttemptMade") {
      notify("Nobody is attempting to hypnotize you right now.");
      return;
    }
    if (promptTimer) {
      clearTimeout(promptTimer);
      promptTimer = null;
    }
    session.choice = choice;
    notify(
      choice === "agree" ? "You let yourself go along with it." : choice === "fight" ? "You brace against it." : "You neither help nor resist."
    );
    beginInductionWindow();
  }
  function selfWake() {
    if (session.phase !== "Hypnotized") {
      notify("You aren't in a trance.");
      return;
    }
    if (session.depth > SELF_WAKE_MAX_DEPTH) {
      notify("You're too far under to surface on your own. (/hypno safeword always works.)");
      return;
    }
    endSession("you woke yourself");
  }
  function safeword() {
    totalStop(
      // Deliberately unambiguous on the hypnotist's screen. A safeword is an OOC stop
      // signal, not an in-fiction escape — the other player needs to read it as "back
      // off now", not wonder whether their subject cleverly broke the trance.
      "They used their safeword. Stop.",
      "Safeword. Trance cleared, all effects released, everything back under your control."
    );
  }
  function hardFloorStop() {
    totalStop(
      "They turned hypnosis off. Everything has been released.",
      "Hypnosis disabled. Trance cleared and every effect released."
    );
  }
  function stopForReset() {
    const ended = session.phase === "Hypnotized" ? "trance" : session.phase === "Idle" ? null : "induction";
    totalStop("They reset the add-on. Everything has been released.", "");
    return ended;
  }
  function totalStop(hypnotistMessage, localMessage) {
    clearTimers();
    clearCurrentDepths();
    stopWaiting();
    stopPersistHeartbeat();
    clearSaved();
    const hypnotist = session.hypnotistId;
    removeEffect("Freeze");
    removeEffect("BlockWardrobe");
    clearFollow();
    clearSuggestedPose();
    clearTranceStates();
    clearAllSuppression();
    clearSelfTouchBlocks();
    clearActiveSuggestions();
    clearOrgasmDenial();
    clearIllusion();
    releaseCarried("total stop");
    clearAllTimers();
    runTeardown();
    session = freshSession();
    if (hypnotist != null) {
      session.hypnotistId = hypnotist;
      pushUpdate(hypnotistMessage);
      session.hypnotistId = null;
    }
    if (localMessage) notify(localMessage);
  }
  function describeSession() {
    const f = getFeatures();
    const granted = Object.keys(f).filter((k) => f[k]).join(", ") || "none";
    const perms = `permissions: ${granted}`;
    const lasting = `${describeIllusion()} | ${describeCarry()}`;
    if (session.phase === "Idle") return `session: Idle | ${lasting} | ${perms}`;
    const bits = [`session: ${session.phase}`];
    if (session.hypnotistId != null) bits.push(`hypnotist=${session.hypnotistId}`);
    if (session.choice) bits.push(`choice=${session.choice}`);
    if (session.attempts) bits.push(`attempts=${session.attempts}/${maxAttempts()}`);
    if (session.phase === "Hypnotized") bits.push(`depth=${session.depth} (${depthBand(session.depth)})`);
    if (session.phase === "AttemptFailed") bits.push(`progress=${session.progress.toFixed(1)}`);
    if (session.cooldownUntil > Date.now())
      bits.push(`cooldown=${Math.ceil((session.cooldownUntil - Date.now()) / 1e3)}s`);
    return `${bits.join(" ")} | ${lasting} | ${perms}`;
  }
  function wakeByHypnotist(sender) {
    if (session.hypnotistId !== sender || session.phase === "Idle") return false;
    endSession("they woke you");
    return true;
  }
  function currentTier() {
    return tierOf(session.phase === "Hypnotized" ? session.depth : 0);
  }
  function currentHypnotistId() {
    return session.phase === "Idle" ? null : session.hypnotistId;
  }
  function isHypnotized() {
    return session.phase === "Hypnotized";
  }
  function isSessionLive() {
    return session.phase !== "Idle" && session.phase !== "CooldownRequired";
  }
  function hasLiveSessionWith(memberNumber) {
    return session.hypnotistId === memberNumber && session.phase !== "Idle";
  }
  function isSessionActiveWith(memberNumber) {
    return session.phase === "Hypnotized" && session.hypnotistId === memberNumber;
  }
  var views = /* @__PURE__ */ new Map();
  function getSessionView(memberNumber) {
    return views.get(memberNumber);
  }
  function countdownRemaining(view, field) {
    return Math.max(0, view[field] - (Date.now() - view.receivedAt));
  }
  function reportMissToHypnotist(sender, message, prev) {
    if (message.refusedReason) return;
    const phase = message.phase;
    if (phase !== "AttemptFailed" && phase !== "CooldownRequired") return;
    if (prev?.phase === phase) return;
    const attempts = Number(message.attempts ?? 0);
    if (phase === "CooldownRequired" && attempts <= 0) return;
    const name = findCharacterName(sender);
    const max = Number(message.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    const flavour = hypnotistMissFlavor(name);
    if (phase === "CooldownRequired") {
      tellPlayer(`${flavour} That was attempt ${attempts} of ${max} \u2014 they are out of reach for a while now.`);
    } else {
      tellPlayer(`${flavour} Attempt ${attempts} of ${max}. You can try again.`);
    }
  }
  function reportExpiryToHypnotist(sender, message) {
    if (message.refusedReason) return;
    if (message.ended !== "timeout" || message.phase !== "Idle") return;
    const name = findCharacterName(sender);
    tellPlayer(`${hypnotistExpiryFlavor(name)} The trance reached its ${TIMEOUT_MINUTES}-minute limit and has ended.`);
  }
  function requestAttempt(memberNumber) {
    sendHiddenMessage(
      { type: "session-attempt", hypnotistName: Player?.Name ?? "Someone", skill: skillValue() },
      memberNumber
    );
    log(`sent session-attempt to ${memberNumber} (skill ${skillValue().toFixed(1)})`);
  }
  function requestContinue(memberNumber) {
    sendHiddenMessage({ type: "session-continue" }, memberNumber);
    log(`sent session-continue to ${memberNumber}`);
  }
  function requestInduction(memberNumber) {
    if (views.get(memberNumber)?.phase === "AttemptFailed") requestContinue(memberNumber);
    else requestAttempt(memberNumber);
  }
  function requestWake(memberNumber) {
    sendHiddenMessage({ type: "session-wake" }, memberNumber);
    log(`sent session-wake to ${memberNumber}`);
  }
  function querySession(memberNumber) {
    views.delete(memberNumber);
    sendHiddenMessage({ type: "session-query" }, memberNumber);
  }
  function restoreSavedSession(saved) {
    session.phase = "Hypnotized";
    session.hypnotistId = saved.hypnotistId;
    session.depth = Number(saved.depth) || 0;
    session.depthEarned = Number(saved.depthEarned) || 0;
    setCurrentDepths(session.depth, session.depthEarned);
    session.hypnotizedAt = Date.now();
    const remaining = (saved.sessionEndsAt || 0) - Date.now();
    if (sessionTimer) clearTimeout(sessionTimer);
    if (remaining > 0) {
      sessionEndsAt = saved.sessionEndsAt;
      sessionTimer = setTimeout(() => expireSession("here"), remaining);
    } else {
      expireSession("away");
      return false;
    }
    startPresenceWatch();
    pushUpdate();
    log(`recovery: session restored, depth ${session.depth}, ${Math.round(remaining / 6e4)} min left`);
    return true;
  }
  function installSession() {
    registerRecoveryHandlers({
      restoreSession: restoreSavedSession,
      restoreCarried: (saved) => {
        restoreActiveSuggestions(saved.applied ?? []);
        if (saved.carried?.length) {
          restoreCarried(saved.carried, saved.carriedUntil, saved.carrierId, saved.carrierName);
        }
      },
      // One reading of the roster for both sides of the same question. recovery.ts wants a
      // plain boolean and treats "cannot tell" as "not here" — which is right for a resume
      // decision, where the default is to keep waiting rather than to restore a trance.
      inRoom: (memberId) => memberInRoom(memberId) === true
    });
    startRecovery();
    registerHiddenHandler("session-query", (sender) => {
      if (session.hypnotistId === sender) pushUpdate();
      else refuse(sender, "");
    });
    registerHiddenHandler("session-attempt", (sender, message) => {
      if (!getFeatures().hypnoEnabled) {
        refuse(sender, "They aren't open to hypnosis.");
        return;
      }
      if (memberInRoom(sender) === false) {
        refuse(sender, "You aren't in the room with them.");
        log(`refused session-attempt from ${sender} \u2014 not on our roster`);
        return;
      }
      if (session.cooldownUntil > Date.now() && session.hypnotistId === sender) {
        refuse(sender, "Not yet \u2014 try again later.");
        return;
      }
      if (session.phase === "Hypnotized") {
        refuse(sender, session.hypnotistId === sender ? "Already under." : "They're already in a trance.");
        return;
      }
      if (session.phase !== "Idle" && session.hypnotistId !== sender) {
        refuse(sender, "Someone else is already working on them.");
        return;
      }
      clearTimers();
      session = freshSession();
      session.hypnotistId = sender;
      session.phase = "AttemptMade";
      session.honouredSkill = honourSkill(getSkillHonour(), Number(message.skill ?? 0), trustWith(sender));
      pushUpdate();
      showPrompt(String(message.hypnotistName ?? `#${sender}`));
    });
    registerHiddenHandler("test-note", (_sender, message) => {
      if (!isTestingMode()) return;
      const text = typeof message.text === "string" ? message.text : "";
      if (text) tellPlayer(text);
    });
    registerHiddenHandler("test-trance", (sender, message) => {
      const full = Number(message.depth ?? 80);
      const earned = Number(message.earned ?? full);
      const refused = forceTrance(sender, full, earned);
      if (refused) {
        refuse(sender, refused);
        return;
      }
      notify(`TESTING: forced under by ${findCharacterName(sender)} at depth ${full}/${earned}.`);
    });
    registerHiddenHandler("session-continue", (sender) => {
      if (session.hypnotistId !== sender) return;
      if (memberInRoom(sender) === false) {
        refuse(sender, "You aren't in the room with them.");
        return;
      }
      if (session.phase !== "AttemptFailed") {
        refuse(
          sender,
          session.phase === "InductionInProgress" ? "The attempt is still running \u2014 wait for it to land or miss." : session.phase === "Hypnotized" ? "They are already under." : "There is no failed attempt to retry."
        );
        return;
      }
      notify("They try again.");
      beginInductionWindow();
    });
    registerHiddenHandler("session-wake", (sender) => {
      if (session.hypnotistId !== sender) return;
      if (session.phase === "Idle") return;
      endSession("they woke you");
    });
    registerHiddenHandler("session-update", (sender, message) => {
      const prev = views.get(sender);
      const newAttempts = Number(message.attempts ?? 0);
      const gained = newAttempts - (prev?.attempts ?? 0);
      if (gained > 0) addSkill(SKILL_ATTEMPT_CREDIT * gained);
      if (message.phase === "Hypnotized" && prev?.phase !== "Hypnotized") addSkill(SKILL_SUCCESS_CREDIT);
      reportMissToHypnotist(sender, message, prev);
      reportExpiryToHypnotist(sender, message);
      views.set(sender, {
        phase: message.phase ?? "Idle",
        attempts: Number(message.attempts ?? 0),
        // The SUBJECT's limit, which they sent us — never our own setting. A hypnotist
        // whose own limit is 3 must not be shown 3 for a subject who allows 2, so the
        // fallback for a message that carries no limit is the decided default rather
        // than getMaxAttempts(). Only a pre-0.65.0 client sends one without it.
        maxAttempts: Number(message.maxAttempts ?? DEFAULT_MAX_ATTEMPTS),
        progressBand: message.progressBand ?? null,
        depthBand: message.depthBand ?? null,
        cooldownRemaining: Number(message.cooldownRemaining ?? 0),
        windowRemaining: Number(message.windowRemaining ?? 0),
        refusedReason: message.refusedReason || null,
        receivedAt: Date.now()
      });
    });
  }

  // src/storage.ts
  var SETTINGS_KEY = "HypnosisAddon";
  function backupKey() {
    const member = Player?.MemberNumber;
    return typeof member === "number" && member > 0 ? `${SETTINGS_KEY}_Backup_${member}` : null;
  }
  var DECAY_PER_DAY = {
    never: 0,
    veryslow: 0.25,
    slow: 1,
    typical: 2,
    fast: 5,
    veryfast: 12
  };
  var DECAY_RATES = [
    { key: "never", label: "Never" },
    { key: "veryslow", label: "Very slowly" },
    { key: "slow", label: "Slowly" },
    { key: "typical", label: "Typical" },
    { key: "fast", label: "Fast" },
    { key: "veryfast", label: "Very fast" }
  ];
  var ATTEMPT_LIMITS = [2, 3];
  var SKILL_HONOUR_RUNGS = [
    { key: "ignore", label: "Ignore it" },
    { key: "trusted", label: "Only from people I trust" },
    { key: "capped", label: "Honour, capped" },
    { key: "floored", label: "Full from people I trust, capped otherwise" },
    { key: "full", label: "Skill can beat my resistance" }
  ];
  var SKILL_HONOUR_OFFERED = SKILL_HONOUR_RUNGS.slice(0, 4);
  var DEFAULT_SKILL_HONOUR = "floored";
  var DEFAULT_MAX_ATTEMPTS = 2;
  function nextAttemptLimit(current) {
    const i = ATTEMPT_LIMITS.indexOf(current);
    return ATTEMPT_LIMITS[(i + 1) % ATTEMPT_LIMITS.length];
  }
  function defaultFeatures() {
    return {
      hypnoEnabled: false,
      movementRestriction: false,
      clothingRestriction: false,
      postureControl: false,
      followControl: false,
      speechRestriction: false,
      selfTouchControl: false,
      compelActivity: false,
      compelTouchOthers: false,
      arousalControl: false,
      illusionControl: false,
      undressControl: false,
      releaseOnDisconnect: false,
      carryForward: false,
      showTriggerWords: false,
      // Off by default — OOC asides pass even while silenced. See the interface note.
      blockOOC: false,
      selfTrigger: false,
      triggerControl: false,
      suppressClothing: false,
      suppressBondage: false,
      suppressActivities: false,
      suppressTriggerSetup: false,
      lockedWhileHypnotized: false,
      // On by default — see the note on the interface.
      tranceCannotMove: true,
      tranceCannotSpeak: true,
      tranceScreenFade: true,
      roomSeesReactions: true,
      // The one trance default that starts off — see the note on the interface.
      tranceClothingFreeze: false
    };
  }
  function defaultSettings() {
    return {
      version: "0.4.0",
      trust: [],
      experience: 0,
      skill: 0,
      triggers: [],
      triggerScope: "hypnotist",
      triggerDurationMinutes: 5,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      // OFF by default, deliberately. Every existing entry carries a `lastUpdated` from
      // whenever it was last touched, so shipping this switched on would decay months of
      // stored trust the first time someone loaded the new build. Opt in.
      decayRate: "never",
      // OFF by default for the same reason trust decay is: every stored trigger carries a
      // reinforcedAt from whenever it was planted, so shipping this switched on would fade
      // triggers that were planted under a promise they would not. Opt in.
      triggerDecayRate: "never",
      depthGates: {},
      chemicalReach: {},
      chemicalScope: "arousal",
      relationshipOverride: {},
      features: defaultFeatures()
    };
  }
  var cached = null;
  var cachedFromAccount = false;
  var lastLoadError = "";
  function normalise(settings) {
    const s = settings ?? defaultSettings();
    const stored = s.features ?? {};
    const merged = defaultFeatures();
    for (const key of Object.keys(merged)) {
      if (typeof stored[key] === "boolean") merged[key] = stored[key];
    }
    s.features = merged;
    s.experience ?? (s.experience = 0);
    s.triggers ?? (s.triggers = []);
    s.triggerScope ?? (s.triggerScope = "hypnotist");
    if (typeof s.triggerDurationMinutes !== "number") s.triggerDurationMinutes = 5;
    if (!ATTEMPT_LIMITS.includes(s.maxAttempts)) s.maxAttempts = DEFAULT_MAX_ATTEMPTS;
    if (typeof s.skill !== "number" || !(s.skill >= 0)) s.skill = 0;
    if (s.skillHonour !== void 0 && !SKILL_HONOUR_RUNGS.some((r) => r.key === s.skillHonour)) {
      delete s.skillHonour;
    }
    if (!DECAY_RATES.some((r) => r.key === s.decayRate)) s.decayRate = "never";
    if (!DECAY_RATES.some((r) => r.key === s.triggerDecayRate)) s.triggerDecayRate = "never";
    if (Array.isArray(s.triggers)) {
      for (const t of s.triggers) {
        if (typeof t.plantedDepth !== "number") t.plantedDepth = 60;
        if (typeof t.plantedChemical !== "boolean") t.plantedChemical = false;
        if (typeof t.reinforcedAt !== "number") t.reinforcedAt = t.installedAt ?? Date.now();
        if (typeof t.firings !== "number") t.firings = 0;
      }
    }
    if (s.starterState === "done" || s.starterState === "applied") s.welcomeShown = true;
    if (!s.depthGates || typeof s.depthGates !== "object") s.depthGates = {};
    if (!s.chemicalReach || typeof s.chemicalReach !== "object") s.chemicalReach = {};
    if (typeof s.chemicalScope !== "string") s.chemicalScope = "arousal";
    if (!s.relationshipOverride || typeof s.relationshipOverride !== "object") s.relationshipOverride = {};
    s.trust ?? (s.trust = []);
    if (typeof Player?.MemberNumber === "number") {
      s.trust = s.trust.filter((t) => t.memberId !== Player.MemberNumber);
    }
    s.trust = s.trust.filter((t) => typeof t.interactions !== "number" || t.interactions > 0);
    for (const entry of s.trust) {
      const legacy = entry.relationshipTrust;
      if (typeof entry.interactions !== "number" && typeof legacy === "number") {
        entry.interactions = countFromValue(legacy, H_TRUST);
        delete entry.relationshipTrust;
        log(`migrated trust for ${entry.memberName}: value ${legacy} \u2192 ${entry.interactions.toFixed(1)} interactions`);
      }
      entry.interactions ?? (entry.interactions = 0);
    }
    return s;
  }
  function loadSettings() {
    const accountRaw = Player?.ExtensionSettings?.[SETTINGS_KEY];
    const haveAccount = typeof accountRaw === "string" && accountRaw.length > 0;
    if (cached && !cachedFromAccount && haveAccount) {
      log("account settings became available after an early read \u2014 reloading");
      cached = null;
    }
    if (cached) return cached;
    const key = backupKey();
    const raw = accountRaw ?? (key ? localStorage.getItem(key) ?? "" : "");
    cachedFromAccount = haveAccount;
    if (!raw) {
      cached = defaultSettings();
      return cached;
    }
    try {
      const json = (0, import_lz_string.decompressFromBase64)(raw);
      cached = json ? JSON.parse(json) : defaultSettings();
    } catch (err) {
      lastLoadError = String(err);
      warn("failed to parse stored settings, resetting", err);
      cached = defaultSettings();
    }
    cached = normalise(cached);
    return cached;
  }
  function saveSettings() {
    if (!cached) return;
    const key = backupKey();
    if (!key) {
      log("not saving \u2014 no MemberNumber yet, so this could belong to the wrong account");
      return;
    }
    const encoded = (0, import_lz_string.compressToBase64)(JSON.stringify(cached));
    if (!Player.ExtensionSettings) Player.ExtensionSettings = {};
    Player.ExtensionSettings[SETTINGS_KEY] = encoded;
    localStorage.setItem(key, encoded);
    ServerPlayerExtensionSettingsSync(SETTINGS_KEY);
  }
  function getTrust(memberId) {
    return loadSettings().trust.find((t) => t.memberId === memberId);
  }
  function getDepthOverride(key) {
    return loadSettings().depthGates[key] ?? "";
  }
  function getChemicalReach(key) {
    return loadSettings().chemicalReach[key] === true;
  }
  function setChemicalReach(key, allowed) {
    const reach = loadSettings().chemicalReach;
    if (allowed) reach[key] = true;
    else delete reach[key];
    saveSettings();
  }
  function setDepthOverride(key, tier) {
    loadSettings().depthGates[key] = tier;
    saveSettings();
  }
  function clearDepthOverrides() {
    const settings = loadSettings();
    settings.depthGates = {};
    saveSettings();
  }
  function getChemicalScope() {
    return loadSettings().chemicalScope ?? "arousal";
  }
  function setChemicalScope(scope) {
    loadSettings().chemicalScope = scope;
    saveSettings();
  }
  function getTriggerDecayRate() {
    return loadSettings().triggerDecayRate;
  }
  function setTriggerDecayRate(rate) {
    loadSettings().triggerDecayRate = rate;
    saveSettings();
  }
  function updateTriggers() {
    saveSettings();
  }
  function getDecayRate() {
    return loadSettings().decayRate;
  }
  function setDecayRate(rate) {
    loadSettings().decayRate = rate;
    saveSettings();
  }
  function applyDecay(entry) {
    if (!entry) return 0;
    const perDay = DECAY_PER_DAY[loadSettings().decayRate] ?? 0;
    if (perDay <= 0 || entry.interactions <= 0) return entry?.interactions ?? 0;
    const days = (Date.now() - entry.lastUpdated) / 864e5;
    const lost = days * perDay;
    if (lost < 1) return entry.interactions;
    entry.interactions = Math.max(0, entry.interactions - lost);
    entry.lastUpdated = Date.now();
    saveSettings();
    return entry.interactions;
  }
  function trustWith(memberId) {
    return valueFromCount(applyDecay(getTrust(memberId)), H_TRUST);
  }
  function addInteractions(memberId, memberName, delta) {
    const settings = loadSettings();
    let entry = settings.trust.find((t) => t.memberId === memberId);
    if (!entry) {
      entry = { memberId, memberName, interactions: 0, lastUpdated: Date.now() };
      settings.trust.push(entry);
    }
    entry.interactions = Math.max(0, entry.interactions + delta);
    if (memberName) entry.memberName = memberName;
    entry.lastUpdated = Date.now();
    saveSettings();
    return entry;
  }
  function setTrustValue(memberId, memberName, value) {
    const settings = loadSettings();
    let entry = settings.trust.find((t) => t.memberId === memberId);
    if (!entry) {
      entry = { memberId, memberName, interactions: 0, lastUpdated: Date.now() };
      settings.trust.push(entry);
    }
    entry.interactions = countFromValue(value, H_TRUST);
    entry.memberName = memberName;
    entry.lastUpdated = Date.now();
    saveSettings();
    return entry;
  }
  function getRelationshipOverride(memberId) {
    const value = loadSettings().relationshipOverride[String(memberId)];
    return value === "friend" || value === "lover" || value === "owner" || value === "none" ? value : null;
  }
  function setRelationshipOverride(memberId, kind) {
    const settings = loadSettings();
    if (kind === null) delete settings.relationshipOverride[String(memberId)];
    else settings.relationshipOverride[String(memberId)] = kind;
    saveSettings();
  }
  function listRelationshipOverrides() {
    const settings = loadSettings();
    return Object.entries(settings.relationshipOverride).map(([id, kind]) => ({ memberId: Number(id), kind }));
  }
  function listTrust() {
    const self = Player?.MemberNumber;
    return loadSettings().trust.filter(
      // Someone decayed to nothing is not a relationship, they are a row taking up space.
      // DW's call. The entry is dropped rather than shown at 0.0 — talking again simply
      // creates a fresh one, so nothing is lost by forgetting a person you no longer know.
      (t) => t.memberId !== self && t.interactions > 0
    );
  }
  function forgetTrust(memberId) {
    const settings = loadSettings();
    const before = settings.trust.length;
    settings.trust = settings.trust.filter((t) => t.memberId !== memberId);
    if (settings.trust.length === before) return false;
    saveSettings();
    log(`forgot trust entry for ${memberId}`);
    return true;
  }
  function listTrustRaw() {
    return loadSettings().trust;
  }
  function experienceValue() {
    return valueFromCount(loadSettings().experience, H_EXPERIENCE);
  }
  function addExperience(delta) {
    const settings = loadSettings();
    settings.experience = Math.max(0, settings.experience + delta);
    saveSettings();
    return experienceValue();
  }
  function setExperienceValue(value) {
    const settings = loadSettings();
    settings.experience = countFromValue(value, H_EXPERIENCE);
    saveSettings();
    return experienceValue();
  }
  function describeStorage() {
    loadSettings();
    const accountRaw = Player?.ExtensionSettings?.[SETTINGS_KEY];
    const key = backupKey();
    const backupRaw = key ? localStorage.getItem(key) : null;
    const summarise = (raw) => {
      if (typeof raw !== "string" || !raw) return "absent";
      try {
        const parsed = JSON.parse((0, import_lz_string.decompressFromBase64)(raw) || "{}");
        const people = (parsed.trust ?? []).length;
        const total = (parsed.trust ?? []).reduce((s, t) => s + (t.interactions ?? 0), 0);
        return `${raw.length} chars, ${people} people, ${total.toFixed(1)} interactions, exp ${parsed.experience ?? 0}`;
      } catch (err) {
        return `${raw.length} chars but UNREADABLE (${err})`;
      }
    };
    return [
      `account:      #${Player?.MemberNumber ?? "unknown"} (backup key ${backupKey() ?? "NONE \u2014 not saving yet"})`,
      `loaded from: ${cachedFromAccount ? "account (ExtensionSettings)" : "localStorage backup or defaults"}`,
      `account:      ${summarise(accountRaw)}`,
      `localStorage: ${summarise(backupRaw)}`,
      `in memory:    ${listTrust().length} people, exp ${experienceValue().toFixed(1)}`,
      lastLoadError ? `LAST LOAD ERROR: ${lastLoadError}` : "no load errors"
    ];
  }
  function exportSettings() {
    return (0, import_lz_string.compressToBase64)(JSON.stringify(loadSettings()));
  }
  function importSettings(blob) {
    const trimmed = (blob ?? "").trim();
    if (!trimmed) return { ok: false, message: "nothing to import" };
    let parsed;
    try {
      const json = (0, import_lz_string.decompressFromBase64)(trimmed);
      if (!json) return { ok: false, message: "not a valid export (could not decompress)" };
      parsed = JSON.parse(json);
    } catch (err) {
      return { ok: false, message: `not a valid export (${err})` };
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.trust)) {
      return { ok: false, message: "not a valid export (missing trust data)" };
    }
    cached = normalise(parsed);
    cachedFromAccount = true;
    saveSettings();
    return {
      ok: true,
      message: `imported ${listTrust().length} people, experience ${experienceValue().toFixed(1)}`
    };
  }
  function resetSettings() {
    let ended = null;
    let stopFailed = false;
    try {
      ended = stopForReset();
    } catch (err) {
      stopFailed = true;
      warn("reset: could not end the session:", err);
    }
    cached = defaultSettings();
    cachedFromAccount = true;
    saveSettings();
    if (stopFailed) {
      return "Settings reset to defaults \u2014 but the trance could not be ended. Use /hypno safeword.";
    }
    if (ended === "trance") return "Trance ended and every effect released. Settings reset to defaults.";
    if (ended === "induction") return "Induction stopped and every effect released. Settings reset to defaults.";
    return "settings reset to defaults";
  }
  function getFeatures() {
    return loadSettings().features;
  }
  function setFeature(key, value) {
    loadSettings().features[key] = value;
    saveSettings();
  }
  function rawExperience() {
    return loadSettings().experience;
  }
  function listTriggers() {
    return loadSettings().triggers;
  }
  function saveTrigger(trigger) {
    const settings = loadSettings();
    settings.triggers = settings.triggers.filter((t) => t.phrase !== trigger.phrase);
    settings.triggers.push(trigger);
    saveSettings();
  }
  function forgetTrigger(phrase) {
    const settings = loadSettings();
    const before = settings.triggers.length;
    settings.triggers = settings.triggers.filter((t) => t.phrase !== phrase);
    saveSettings();
    return before - settings.triggers.length;
  }
  function getTriggerScope() {
    return loadSettings().triggerScope;
  }
  function setTriggerScope(scope) {
    loadSettings().triggerScope = scope;
    saveSettings();
  }
  function getMaxAttempts() {
    return loadSettings().maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  }
  function getSkillHonour() {
    return loadSettings().skillHonour ?? DEFAULT_SKILL_HONOUR;
  }
  function getStarterState() {
    const s = loadSettings().starterState;
    return s === "applied" || s === "done" ? s : "new";
  }
  function setStarterState(state) {
    if (state === "new") delete loadSettings().starterState;
    else loadSettings().starterState = state;
    saveSettings();
  }
  function wasWelcomeShown() {
    return loadSettings().welcomeShown === true;
  }
  function markWelcomeShown() {
    loadSettings().welcomeShown = true;
    saveSettings();
  }
  var PERMISSION_KEYS = [
    "movementRestriction",
    "clothingRestriction",
    "postureControl",
    "followControl",
    "speechRestriction",
    "selfTouchControl",
    "compelActivity",
    "compelTouchOthers",
    "arousalControl",
    "illusionControl",
    "undressControl",
    "triggerControl",
    "carryForward"
  ];
  function hasAnyPermissionGranted() {
    const f = loadSettings().features;
    return PERMISSION_KEYS.some((k) => f[k] === true);
  }
  function setSkillHonour(rung) {
    if (SKILL_HONOUR_RUNGS.some((r) => r.key === rung)) loadSettings().skillHonour = rung;
    saveSettings();
  }
  function nextSkillHonour(current) {
    const i = SKILL_HONOUR_OFFERED.findIndex((r) => r.key === current);
    return SKILL_HONOUR_OFFERED[(i + 1) % SKILL_HONOUR_OFFERED.length].key;
  }
  function addSkill(delta) {
    const settings = loadSettings();
    settings.skill = Math.max(0, settings.skill + delta);
    saveSettings();
    return skillValue();
  }
  function skillValue() {
    return valueFromCount(loadSettings().skill, H_EXPERIENCE);
  }
  function skillCount() {
    return loadSettings().skill;
  }
  function setMaxAttempts(limit) {
    const value = ATTEMPT_LIMITS.includes(limit) ? limit : DEFAULT_MAX_ATTEMPTS;
    loadSettings().maxAttempts = value;
    saveSettings();
    return value;
  }
  function getTriggerDuration() {
    return loadSettings().triggerDurationMinutes;
  }
  function setTriggerDuration(minutes) {
    const value = Number.isFinite(minutes) ? Math.max(0, Math.min(1440, Math.round(minutes))) : 5;
    loadSettings().triggerDurationMinutes = value;
    saveSettings();
    return value;
  }

  // src/selftouch.ts
  var BODY_PARTS = {
    breasts: ["ItemBreast", "ItemNipples"],
    breast: ["ItemBreast", "ItemNipples"],
    chest: ["ItemBreast", "ItemNipples"],
    nipples: ["ItemNipples"],
    nipple: ["ItemNipples"],
    // The broad words cover the clitoris too; the specific ones don't reach back.
    pussy: ["ItemVulva", "ItemVulvaPiercings"],
    vulva: ["ItemVulva", "ItemVulvaPiercings"],
    cunt: ["ItemVulva", "ItemVulvaPiercings"],
    clit: ["ItemVulvaPiercings"],
    clitoris: ["ItemVulvaPiercings"],
    // Same two slots as above — see the note on ItemPenis not existing.
    cock: ["ItemVulva", "ItemVulvaPiercings"],
    penis: ["ItemVulva", "ItemVulvaPiercings"],
    dick: ["ItemVulva", "ItemVulvaPiercings"],
    tip: ["ItemVulvaPiercings"],
    crotch: ["ItemVulva", "ItemVulvaPiercings", "ItemPelvis"],
    butt: ["ItemButt"],
    ass: ["ItemButt"],
    bottom: ["ItemButt"],
    mouth: ["ItemMouth"],
    lips: ["ItemMouth"],
    face: ["ItemHead"],
    head: ["ItemHead"],
    hair: ["ItemHead"],
    ears: ["ItemEars"],
    ear: ["ItemEars"],
    nose: ["ItemNose"],
    neck: ["ItemNeck"],
    throat: ["ItemNeck"],
    // "Legs" as spoken means the whole leg, so it takes both of BC's leg zones.
    legs: ["ItemLegs", "ItemFeet"],
    leg: ["ItemLegs", "ItemFeet"],
    thighs: ["ItemLegs"],
    feet: ["ItemBoots"],
    toes: ["ItemBoots"],
    hands: ["ItemHands"],
    arms: ["ItemArms"],
    shoulders: ["ItemArms"],
    belly: ["ItemPelvis", "ItemTorso"],
    stomach: ["ItemPelvis", "ItemTorso"],
    tummy: ["ItemPelvis", "ItemTorso"],
    waist: ["ItemTorso"],
    ribs: ["ItemTorso"],
    hips: ["ItemPelvis"]
  };
  var blockedGroups = /* @__PURE__ */ new Map();
  var blockAllSelfTouch = false;
  var commandInProgress = false;
  function beginCommandedActivity() {
    commandInProgress = true;
  }
  function endCommandedActivity() {
    commandInProgress = false;
  }
  function setBodyPartBlocked(word, groups, on) {
    for (const g of groups) {
      if (on) blockedGroups.set(g, word);
      else blockedGroups.delete(g);
    }
  }
  function setAllSelfTouchBlocked(on) {
    blockAllSelfTouch = on;
  }
  function clearSelfTouchBlocks() {
    blockedGroups.clear();
    blockAllSelfTouch = false;
  }
  function selfTouchSnapshot() {
    return { all: blockAllSelfTouch, groups: [...blockedGroups.entries()] };
  }
  function restoreSelfTouch(snap) {
    clearSelfTouchBlocks();
    blockAllSelfTouch = !!snap?.all;
    for (const [group, word] of snap?.groups ?? []) blockedGroups.set(group, word);
  }
  function describeSelfTouchBlocks() {
    const parts = [...new Set(blockedGroups.values())];
    return `${blockAllSelfTouch ? "all self-touch blocked; " : ""}${parts.length ? `parts: ${parts.join(", ")}` : "no parts blocked"}`;
  }
  function isSelfActivity(actor, acted) {
    return !!actor?.IsPlayer?.() && !!acted?.IsPlayer?.();
  }
  function groupNamesFor(targetGroup) {
    const names = [targetGroup?.Name].filter(Boolean);
    try {
      const mirrored = ActivityGetGroupOrMirror?.(Player?.AssetFamily ?? "Female3DCG", targetGroup?.Name);
      if (mirrored?.Name && !names.includes(mirrored.Name)) names.push(mirrored.Name);
    } catch {
    }
    return names;
  }
  function installSelfTouch(modApi2) {
    modApi2.hookFunction(
      "ActivityRun",
      10,
      ((args, next) => {
        try {
          if (commandInProgress) return next(args);
          if (!getFeatures().hypnoEnabled) return next(args);
          const [actor, acted, targetGroup] = args;
          if (isSelfActivity(actor, acted)) {
            if (hasOwnEffect("Freeze")) {
              announce("selftouch-frozen");
              return void 0;
            }
            if (blockAllSelfTouch) {
              announce("selftouch-blocked");
              return void 0;
            }
            for (const name of groupNamesFor(targetGroup)) {
              const word = blockedGroups.get(name);
              if (word) {
                announceBodyPart(word);
                return void 0;
              }
            }
          }
        } catch (err) {
          warn("self-touch check failed:", err);
        }
        return next(args);
      })
    );
    log("self-touch hook installed on ActivityRun");
  }

  // src/undress.ts
  var UNDRESS_ORDER = [
    "Cloth",
    "ClothLower",
    "SuitTop",
    "SuitLower",
    "Bra",
    "Panties",
    "Socks",
    "Shoes",
    "Gloves"
  ];
  function undressBlockedReason() {
    if (typeof InventoryRemove !== "function" || !Array.isArray(Player?.Appearance)) {
      return "unavailable";
    }
    if (Player?.CanInteract?.() === false) return "bound";
    if (hasOwnEffect("Freeze")) return "frozen";
    if (Player?.CanChangeOwnClothes?.() === false && !hasOwnEffect("BlockWardrobe")) {
      return "locked";
    }
    return null;
  }
  function wornGarments() {
    return UNDRESS_ORDER.filter((g) => {
      try {
        return !!InventoryGet(Player, g);
      } catch {
        return false;
      }
    });
  }
  function undress(count) {
    const blocked = undressBlockedReason();
    if (blocked) return { removed: [], refusal: blocked };
    const worn = wornGarments();
    if (!worn.length) return { removed: [], refusal: "already bare" };
    const removed = [];
    for (const group of worn.slice(0, count)) {
      try {
        InventoryRemove(Player, group, false);
        removed.push(group);
      } catch (err) {
        warn(`could not remove ${group}:`, err);
      }
    }
    if (!removed.length) return { removed: [], refusal: "unavailable" };
    try {
      CharacterRefresh(Player, true, false);
      if (ServerPlayerIsInChatRoom()) ChatRoomCharacterUpdate(Player);
    } catch (err) {
      warn("could not sync appearance after undressing:", err);
    }
    log(`undressed: ${removed.join(", ")}`);
    return { removed };
  }

  // src/triggers.ts
  function tellHypnotist(hypnotistId, text) {
    sendHiddenMessage({ type: "trigger-status", text }, hypnotistId);
  }
  function installTriggers() {
    registerHiddenHandler("trigger-status", (sender, message) => {
      const text = typeof message.text === "string" ? message.text : "";
      if (text) tellPlayer(text);
    });
    registerHiddenHandler("test-age", (sender, message) => {
      const days = Number(message.days ?? 1);
      const index = message.index == null ? void 0 : Number(message.index);
      const result = ageTriggers(days, index);
      if (result.refusal) {
        tellHypnotist(sender, `[trigger] Aging refused \u2014 ${result.refusal}.`);
        return;
      }
      tellHypnotist(
        sender,
        `[trigger] Aged ${result.aged} trigger(s) by ${days} day(s). ${result.lines.join("  |  ")}`
      );
      const who = characterFor2(sender)?.Name ?? `#${sender}`;
      tellPlayer(`TESTING: ${who} aged ${result.aged} trigger(s) by ${days} day(s).`);
      result.lines.forEach(tellPlayer);
    });
  }
  var MIN_PHRASE_LENGTH = 5;
  var MAX_ACTIONS = 8;
  var TRIGGER_DECAY_PER_DAY = {
    never: 0,
    veryslow: 5,
    slow: 15,
    typical: 40,
    fast: 90,
    veryfast: 300
  };
  var DECAY_GRACE_DAYS = 14;
  var TIER_HOLD = {
    drifting: 1,
    yielding: 0.8,
    entranced: 0.6,
    deep: 0.4,
    blank: 0.25
  };
  var CHEMICAL_DECAY_PER_DAY = 150;
  var FIRING_CREDIT_FRACTION = 0.06;
  var MAX_FIRING_CREDIT_FRACTION = 0.5;
  var TRIGGER_GHOST_THRESHOLD = 10;
  function triggerStrength(t) {
    if (t.plantedDepth <= 0) return 0;
    const perDay = decayPerDayFor(t);
    if (perDay <= 0) return t.plantedDepth;
    const creditFraction = Math.min((t.firings ?? 0) * FIRING_CREDIT_FRACTION, MAX_FIRING_CREDIT_FRACTION);
    const days = Math.max(0, (Date.now() - t.reinforcedAt) / 864e5 - creditFraction * lifeDays(t.plantedDepth, perDay));
    return Math.max(0, Math.round(t.plantedDepth - perDay * days * (1 + days / DECAY_GRACE_DAYS)));
  }
  function lifeDays(strength, perDay) {
    if (perDay <= 0 || strength <= 0) return Infinity;
    return DECAY_GRACE_DAYS / 2 * (Math.sqrt(1 + 4 * strength / (perDay * DECAY_GRACE_DAYS)) - 1);
  }
  function describeDuration(days) {
    if (!Number.isFinite(days)) return "never";
    const hours = days * 24;
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutes`;
    if (hours < 36) return `${Math.round(hours)} hours`;
    return `${days < 10 ? days.toFixed(1) : Math.round(days)} days`;
  }
  function describeDecayPace(rate = getTriggerDecayRate()) {
    const perDay = (TRIGGER_DECAY_PER_DAY[rate] ?? 0) * TIER_HOLD.deep;
    if (perDay <= 0) return "never \u2014 planted triggers stay until something else removes them";
    return `a Deep planting fades away in about ${describeDuration(lifeDays(60, perDay))}, unused and unreinforced`;
  }
  function decayLifetimeText(rate = getTriggerDecayRate()) {
    const perDay = (TRIGGER_DECAY_PER_DAY[rate] ?? 0) * TIER_HOLD.deep;
    if (perDay <= 0) return "A planted trigger stays until it is removed.";
    return `A Deep planting lasts about ${describeDuration(lifeDays(60, perDay))} if it is never used.`;
  }
  function decayPerDayFor(t) {
    if (t.plantedChemical) return CHEMICAL_DECAY_PER_DAY;
    const base = TRIGGER_DECAY_PER_DAY[getTriggerDecayRate()] ?? 0;
    return base * (TIER_HOLD[tierOf(t.plantedDepth)] ?? 1);
  }
  function pruneFadedTriggers(isHolding) {
    const all = listTriggers();
    const dead = all.filter((t) => triggerStrength(t) <= 0 && !isHolding(t));
    if (!dead.length) return 0;
    for (const t of dead) {
      log(`trigger "${t.phrase}" has faded away entirely (planted ${t.plantedDepth}, by ${t.installedByName})`);
      forgetTrigger(t.phrase);
    }
    return dead.length;
  }
  function describeStrength(t) {
    const now = triggerStrength(t);
    const label = tierLabel(tierOf(now));
    if (now <= 0) return "faded away";
    if (now < TRIGGER_GHOST_THRESHOLD) return `a vague pull only (${now})`;
    if (now >= t.plantedDepth) return `full strength (${now}, ${label})`;
    return `${now}/${t.plantedDepth} \u2014 reaches ${label}`;
  }
  function reinforceTriggersBy(hypnotistId) {
    const mine = listTriggers().filter((t) => t.installedBy === hypnotistId);
    if (!mine.length) return 0;
    for (const t of mine) {
      t.reinforcedAt = Date.now();
      t.firings = 0;
    }
    updateTriggers();
    log(`reinforced ${mine.length} trigger(s) for ${hypnotistId}`);
    return mine.length;
  }
  function noteTriggerFired(t) {
    t.firings = (t.firings ?? 0) + 1;
    updateTriggers();
  }
  function ageTriggers(days, index) {
    const refuse2 = (why) => ({ refusal: why, lines: [], aged: 0 });
    if (!isTestingMode()) return refuse2("not available outside the testing room");
    if (!Number.isFinite(days) || days === 0) {
      return refuse2("give a number of days to age by \u2014 1, 0.5, or a negative number to wind it back");
    }
    const all = listTriggers();
    if (!all.length) return refuse2("no triggers planted");
    if (index !== void 0 && (!Number.isInteger(index) || index < 1 || index > all.length)) {
      return refuse2(`no trigger ${index} \u2014 you have ${all.length}. See /hypno triggers for the numbering`);
    }
    const chosen = index === void 0 ? all.slice() : [all[index - 1]];
    const lines = [];
    for (const t of chosen) {
      const before = describeStrength(t);
      t.reinforcedAt = Math.min(Date.now(), t.reinforcedAt - days * 864e5);
      lines.push(`${all.indexOf(t) + 1}. by ${t.installedByName}: ${before} -> ${describeStrength(t)}`);
    }
    updateTriggers();
    log(`TESTING: aged ${chosen.length} trigger(s) by ${days} day(s)`);
    return { refusal: null, lines, aged: chosen.length };
  }
  var recording = null;
  function isRecording() {
    return recording !== null;
  }
  function cancelRecording() {
    recording = null;
  }
  onTeardown(() => {
    if (recording) {
      log(`trance torn down mid-recording \u2014 abandoning "${recording.phrase}"`);
      recording = null;
    }
  });
  var COLLISION_REFUSAL_CAP = 4;
  var COLLISION_WINDOW_MS = 10 * 6e4;
  var collisionRefusalCount = 0;
  var collisionWindowStart = 0;
  var COLLISION_FLAT = "[trigger] Refused \u2014 too many trigger attempts just now. Try again in a little while.";
  var COLLISION_VAGUE = "[trigger] Refused \u2014 that phrase is too close to something already set aside in her. Choose a different, more distinctive word.";
  function collisionRateLimited() {
    const now = Date.now();
    if (now - collisionWindowStart > COLLISION_WINDOW_MS) {
      collisionWindowStart = now;
      collisionRefusalCount = 0;
    }
    collisionRefusalCount++;
    return collisionRefusalCount > COLLISION_REFUSAL_CAP;
  }
  function phraseAvailability(sender, phrase, isHolding) {
    const existing = listTriggers();
    const exact = existing.find((t) => t.phrase === phrase);
    if (exact) {
      if (exact.installedBy === sender) {
        if (isHolding(exact)) {
          return `[trigger] "${phrase}" is one of yours and is holding her right now \u2014 it can't be replaced until it lets go (she can wake or safeword to clear it).`;
        }
        return null;
      }
      if (currentDepthEarned() <= exact.plantedDepth) {
        return collisionRateLimited() ? COLLISION_FLAT : "[trigger] Refused \u2014 you are not deep enough with her to take that word.";
      }
      if (isHolding(exact)) {
        return "[trigger] Refused \u2014 that word is holding her right now and can't be replaced until it lets go.";
      }
      return null;
    }
    const overlap = existing.filter((t) => phrase.includes(t.phrase) || t.phrase.includes(phrase));
    if (!overlap.length) return null;
    const own = overlap.find((t) => t.installedBy === sender);
    if (own) {
      return `[trigger] Your own "${own.phrase}" already overlaps this \u2014 pick a word that doesn't run into it.`;
    }
    return collisionRateLimited() ? COLLISION_FLAT : COLLISION_VAGUE;
  }
  function renameRecording(sender, phrase, isHolding = () => false) {
    if (!recording) return;
    if (phrase.length < MIN_PHRASE_LENGTH) {
      tellHypnotist(
        recording.hypnotistId,
        `[trigger] "${phrase}" is too short; a trigger phrase must be at least ${MIN_PHRASE_LENGTH} characters. Kept "${recording.phrase}".`
      );
      return;
    }
    const refusal = phraseAvailability(sender, phrase, isHolding);
    if (refusal) {
      tellHypnotist(recording.hypnotistId, `${refusal} Kept "${recording.phrase}".`);
      return;
    }
    const old = recording.phrase;
    recording.phrase = phrase;
    log(`trigger recording renamed "${old}" -> "${phrase}"`);
    tellHypnotist(recording.hypnotistId, `[trigger] Renamed to "${phrase}" \u2014 ${recording.actions.length} suggestion(s) kept.`);
  }
  function beginRecording(hypnotistId, hypnotistName, phrase, isHolding = () => false) {
    const refuse2 = (why) => {
      tellHypnotist(hypnotistId, why);
      return "";
    };
    const features = getFeatures();
    if (!features.hypnoEnabled) {
      log("trigger plant refused: hypnoEnabled off");
      return refuse2("[trigger] Refused \u2014 they have not enabled Hypnosis.");
    }
    if (!features.triggerControl) {
      log("trigger plant refused: triggerControl not granted");
      return refuse2('[trigger] Refused \u2014 they have not enabled "Triggers" in their Hypnosis Add-on settings.');
    }
    const refusal = depthRefusal("triggerControl");
    if (refusal) {
      log(`trigger plant refused: ${refusal}`);
      return refuse2(
        `[trigger] Refused \u2014 planting a trigger ${refusal}. Take them deeper first; arousal does not count toward this one.`
      );
    }
    if (phrase.length < MIN_PHRASE_LENGTH) {
      return refuse2(`[trigger] Refused \u2014 "${phrase}" is too short; a trigger phrase must be at least ${MIN_PHRASE_LENGTH} characters.`);
    }
    const plantedChemical = !depthAllows("triggerControl", currentDepthEarned(), currentDepthEarned());
    const plantedDepth = plantedChemical ? currentDepth() : currentDepthEarned();
    if (plantedDepth < TRIGGER_GHOST_THRESHOLD) {
      log(`trigger plant refused: would be born a ghost at depth ${plantedDepth}`);
      return refuse2(
        `[trigger] Refused \u2014 at this depth a trigger is too faint to ever fire (it would be a ghost). Take them deeper first.`
      );
    }
    const unavailable = phraseAvailability(hypnotistId, phrase, isHolding);
    if (unavailable) {
      log(`trigger plant refused: phrase "${phrase}" is unavailable`);
      return refuse2(unavailable);
    }
    recording = {
      hypnotistId,
      hypnotistName,
      phrase,
      actions: [],
      plantedDepth,
      plantedChemical
    };
    log(`recording trigger "${phrase}" for ${hypnotistName}`);
    tellHypnotist(
      hypnotistId,
      `[trigger] RECORDING "${phrase}". Say each suggestion, then "remember trigger" to save (or "forget the trigger" to cancel).`
    );
    return "Something is being set aside in you. You let it happen.";
  }
  function recordAction(id) {
    if (!recording) return null;
    if (recording.actions.length >= MAX_ACTIONS) {
      log(`trigger action ignored \u2014 already at the ${MAX_ACTIONS} action cap`);
      tellHypnotist(recording.hypnotistId, `[trigger] Ignored \u2014 already at the ${MAX_ACTIONS} action limit.`);
      return "Nothing more will fit.";
    }
    recording.actions.push(id);
    log(`trigger "${recording.phrase}" now has ${recording.actions.length} action(s)`);
    tellHypnotist(
      recording.hypnotistId,
      `[trigger] Recorded ${id} into "${recording.phrase}" (${recording.actions.length} so far).`
    );
    return "That settles into place, waiting.";
  }
  function commitRecording(isHolding = () => false) {
    if (!recording) return "";
    if (!recording.actions.length) {
      tellHypnotist(recording.hypnotistId, `[trigger] Nothing was recorded for "${recording.phrase}", so nothing was saved.`);
      recording = null;
      return "Whatever it was, it comes to nothing.";
    }
    const unavailable = phraseAvailability(recording.hypnotistId, recording.phrase, isHolding);
    if (unavailable) {
      tellHypnotist(
        recording.hypnotistId,
        `${unavailable} Say a different trigger word to rename this one \u2014 the ${recording.actions.length} suggestion(s) you recorded are kept.`
      );
      return "";
    }
    const displaced = listTriggers().some((t) => t.phrase === recording.phrase && t.installedBy !== recording.hypnotistId);
    const trigger = {
      phrase: recording.phrase,
      actions: recording.actions.slice(),
      installedBy: recording.hypnotistId,
      installedByName: recording.hypnotistName,
      installedAt: Date.now(),
      plantedDepth: recording.plantedDepth,
      plantedChemical: recording.plantedChemical,
      reinforcedAt: Date.now(),
      firings: 0
    };
    saveTrigger(trigger);
    const count = trigger.actions.length;
    log(`trigger committed: "${trigger.phrase}" (${count} actions) by ${trigger.installedByName}`);
    tellHypnotist(
      trigger.installedBy,
      `[trigger] SAVED "${trigger.phrase}" \u2014 ${count} action(s): ${trigger.actions.join(", ")}. Planted at ${trigger.plantedDepth} (${tierLabel(tierOf(trigger.plantedDepth))}). Saying it will now fire them, in or out of trance.`
    );
    recording = null;
    return displaced ? "Something already set aside in you comes loose \u2014 and something new settles into the space it leaves." : "It settles somewhere you won't think to look for it.";
  }
  var TRIGGER_SCOPES = [
    { key: "hypnotist", label: "Hypnotist only" },
    { key: "owner", label: "Hypnotist and Owner" },
    { key: "lovers", label: "Hypnotist, Owner and Lovers" },
    { key: "whitelist", label: "Hypnotist, Owner, Lovers and whitelist" },
    { key: "dominants", label: "Hypnotist, Owner, Lovers, whitelist & Dominants" },
    { key: "notblack", label: "Hypnotist and everyone, except blacklist" },
    { key: "everyone", label: "Hypnotist and everyone, no exceptions" }
  ];
  function characterFor2(memberNumber) {
    return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find(
      (c) => c?.MemberNumber === memberNumber
    );
  }
  function speakerAllowedByScope(speaker) {
    const scope = getTriggerScope();
    if (scope === "hypnotist") return false;
    if (speaker === Player?.MemberNumber) return false;
    const C = characterFor2(speaker);
    if (!C) return false;
    if (Player?.IsOwnedByCharacter?.(C)) return true;
    if (scope === "everyone") return true;
    if (Player?.HasOnBlacklist?.(C)) return false;
    if (scope === "notblack") return true;
    if (scope === "owner") return false;
    if (C.IsLoverOfCharacter?.(Player)) return true;
    if (scope === "lovers") return false;
    if (Player?.HasOnWhitelist?.(C)) return true;
    if (scope === "whitelist") return false;
    try {
      return ReputationCharacterGet(C, "Dominant") + 25 >= ReputationCharacterGet(Player, "Dominant");
    } catch {
      return false;
    }
  }
  function triggersFiredBy(speaker, normalisedText) {
    if (!normalisedText) return [];
    const matching = listTriggers().filter((t) => normalisedText.includes(t.phrase));
    if (speaker === Player?.MemberNumber) return getFeatures().selfTrigger ? matching : [];
    const allowedByScope = speakerAllowedByScope(speaker);
    return matching.filter((t) => t.installedBy === speaker || allowedByScope);
  }
  function triggersReleasableBy(speaker, normalisedText) {
    if (!normalisedText) return [];
    const matching = listTriggers().filter((t) => normalisedText.includes(t.phrase));
    if (speaker === Player?.MemberNumber) return matching;
    const allowedByScope = speakerAllowedByScope(speaker);
    return matching.filter((t) => t.installedBy === speaker || allowedByScope);
  }
  function triggersArmed() {
    const features = getFeatures();
    return features.hypnoEnabled && features.triggerControl;
  }
  function installerHasSession(trigger) {
    return isSessionActiveWith(trigger.installedBy);
  }

  // src/voice.ts
  function normalize(text) {
    return text.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/\bcan'?t\b/g, "cannot").replace(/\bcan not\b/g, "cannot").replace(/\bdon'?t\b/g, "do not").replace(/\bwon'?t\b/g, "will not").replace(/\bmustn'?t\b/g, "must not").replace(/\bdoesn'?t\b/g, "does not").replace(/\bisn'?t\b/g, "is not").replace(/\baren'?t\b/g, "are not").replace(/\byou'?re\b/g, "you are").replace(/\byou'?ve\b/g, "you have").replace(/\bur\b/g, "your").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  function unstutter(content) {
    return String(content ?? "").replace(/(?<![\p{L}\p{N}'’-])(\p{L})(?:-\1)*-(?=\1)/giu, "");
  }
  function stripOOC(content) {
    const text = String(content ?? "");
    let kept = "";
    let depth = 0;
    for (const ch of text) {
      if (ch === "(") {
        depth++;
        kept += " ";
      } else if (ch === ")" && depth > 0) {
        depth--;
      } else if (depth === 0) {
        kept += ch;
      }
    }
    const final = kept.replace(/\s+/g, " ").trim();
    return final.length ? final : null;
  }
  function applyArousal(level) {
    if (!setArousalLevel(level)) return "arousal-unavailable";
  }
  var ORGASM_DENIED_UNTIL = /\b(?:cannot|will not|may not|must not|not allowed|not permitted|forbidden|do not|never|no)\b.*\b(?:come|cum|orgasm|climax|finish|coming|cumming)\b.*\b(?:until|unless|till|before)\b/;
  var UNDRESS_IS_THE_OBJECT = [/\bnotic(e|es|ed|ing)\b/, /\bunnoticed\b/];
  function applyUndress(count) {
    const liftedOwnFreeze = hasOwnEffect("Freeze");
    if (liftedOwnFreeze) {
      removeEffect("Freeze");
      if (typeof CharacterLoadEffect === "function") CharacterLoadEffect(Player);
    }
    try {
      const result = undress(count);
      if (result.refusal === "already bare") return "undress-bare";
      if (result.refusal === "frozen") return "undress-frozen";
      if (result.refusal) return "undress-blocked";
      return count === 1 ? "undress" : "undress-all";
    } finally {
      if (liftedOwnFreeze) {
        applyEffect("Freeze");
        if (typeof CharacterLoadEffect === "function") CharacterLoadEffect(Player);
      }
    }
  }
  function applyForcedOrgasm() {
    const liftedOwnDenial = orgasmDeniedByUs();
    if (liftedOwnDenial) setOrgasmDenied(false);
    try {
      const result = forceOrgasm();
      if (result === "unavailable") return "arousal-unavailable";
      if (result === "denied") return "orgasm-refused";
    } finally {
      if (liftedOwnDenial) setOrgasmDenied(true);
    }
  }
  function permissionReason(suggestion, features) {
    if (suggestion.release) return null;
    if (!features.hypnoEnabled) return "hypnoEnabled is off";
    if (!permitted(suggestion, features)) return `${suggestion.permission} isn't granted`;
    return null;
  }
  function blockedReason(suggestion, speaker, features) {
    const permission = permissionReason(suggestion, features);
    if (permission) return permission;
    if (suggestion.release) return null;
    const depthBlock = depthReason(suggestion, features);
    if (depthBlock) return depthBlock;
    return null;
  }
  function depthReason(suggestion, features) {
    const keys = (Array.isArray(suggestion.permission) ? suggestion.permission : [suggestion.permission]).filter(
      (k) => features[k]
    );
    if (!keys.length) return null;
    if (keys.some((k) => depthAllows(k))) return null;
    return depthRefusal(keys[0]);
  }
  function reachableCategories(keys, features) {
    const applied2 = [];
    const skipped = [];
    for (const key of keys) {
      if (!features[key]) skipped.push({ key, why: "not permitted" });
      else if (!depthAllows(key)) skipped.push({ key, why: depthRefusal(key) ?? "too shallow" });
      else applied2.push(key);
    }
    return { applied: applied2, skipped };
  }
  var CATEGORY_WORDS = {
    suppressClothing: "clothing",
    suppressBondage: "bondage",
    suppressActivities: "touches"
  };
  function permitted(suggestion, features) {
    const keys = Array.isArray(suggestion.permission) ? suggestion.permission : [suggestion.permission];
    return keys.some((k) => features[k]);
  }
  function releasesOf(suggestion) {
    const of = suggestion.releaseOf;
    return of === void 0 ? [] : Array.isArray(of) ? of : [of];
  }
  function applyPose(pose) {
    if (!setSuggestedPose(pose)) return "pose-blocked";
  }
  function poseSuggestion(id, pose, examples, patterns, unless) {
    return {
      id,
      examples,
      permission: "postureControl",
      patterns,
      unless,
      run: () => applyPose(pose),
      // Undo only while it is still this pose: a trigger's kneel must not also undo a spread said since.
      undo: () => clearSuggestedPose(poseGroupOf(pose) ?? "stance", pose)
    };
  }
  var STANCE_IDS = ["kneel", "kneel-spread", "legs-spread", "legs-closed", "all-fours", "lie-down"];
  var ARM_IDS = ["hands-behind", "arms-behind", "elbows-behind", "arms-up", "arms-out"];
  var POSE_SUGGESTIONS = [
    poseSuggestion("kneel-spread", "KneelingSpread", ["kneel spread", "spread your knees"], [
      /\bkneel (?:with your knees )?(?:spread|apart)\b/,
      /\bspread your knees\b/,
      /\bknees (?:apart|spread|wide)\b/
    ]),
    poseSuggestion("legs-spread", "Spread", ["spread your legs", "stand with your legs apart"], [
      /\b(?:spread|part) your legs\b/,
      /\b(?:legs|feet) (?:apart|wide)\b/
    ]),
    poseSuggestion("legs-closed", "LegsClosed", ["legs closed", "feet together"], [
      /\b(?:legs|feet) (?:closed|together)\b/,
      /\bclose your legs\b/
    ]),
    poseSuggestion("all-fours", "AllFours", ["on all fours", "get on your hands and knees"], [
      /\bon all fours\b/,
      /\bon your hands and knees\b/
    ]),
    poseSuggestion("lie-down", "Hogtied", ["lie down", "down on your stomach"], [
      /(?<!\bi )(?<!\bwe )\b(?:lie|lay) down\b/,
      /\bon your (?:stomach|belly|front)\b/
    ]),
    // Arms. Names per DW's verified reference (docs/bc-pose-reference.md): BC has no crossed-arms
    // pose and no surrender pose, so "cross your arms" is not offered and "surrender" raises the
    // arms over the head, its closest pose.
    poseSuggestion("hands-behind", "BackCuffs", ["hands behind your back", "clasp your hands behind your back"], [
      /\bhands behind your back\b/
    ]),
    poseSuggestion("arms-behind", "BackBoxTie", ["arms behind your back", "box your arms"], [
      /\barms behind your back\b/,
      /\bbox your arms\b/
    ]),
    poseSuggestion("elbows-behind", "BackElbowTouch", ["elbows behind your back"], [
      /\belbows (?:behind your back|together)\b/
    ]),
    poseSuggestion("arms-up", "OverTheHead", ["put your hands up", "raise your arms", "hands above your head", "surrender", "hands where I can see them"], [
      /\b(?:hands|arms) up\b/,
      /\braise your (?:arms|hands)\b/,
      /\b(?:hands|arms) (?:above|over) your head\b/,
      // Bare "surrender" is also ordinary hypnosis patter ("surrender to my voice"). Kept on
      // DW's call, 2026-09-23, with the conflict noted in the wiki rather than guarded here.
      /(?<!\bi )(?<!\bwe )\bsurrender\b/,
      /\bwhere i can see them\b/
    ]),
    poseSuggestion("arms-out", "Yoked", ["hold your arms out", "yoke your arms"], [
      /\b(?:hold|put|stretch) your arms out\b/,
      /\byoke your arms\b/
    ]),
    {
      id: "arms-relax",
      examples: ["relax your arms", "arms at your sides"],
      release: true,
      releaseOf: ARM_IDS,
      permission: "postureControl",
      // "Relax your arms" is induction patter too; kept on DW's call, 2026-09-23. Like "stand",
      // it clears any arm pose, including one the subject chose themselves.
      patterns: [
        /\brelax your arms\b/,
        /\b(?:arms|hands) (?:at|by) your sides?\b/,
        /\b(?:lower|drop) your (?:arms|hands)\b/,
        /\b(?:arms|hands) down\b/
      ],
      run: () => setSuggestedPose(null, "arms") ? void 0 : "pose-blocked"
    }
  ];
  var SUGGESTIONS = [
    // Arousal goes FIRST. Its patterns are the most specific in the table (every one names
    // arousal, an orgasm, or the edge), so it can't shadow anything below it — while the
    // reverse is not true: "you are stuck at the edge" would otherwise be eaten by
    // movement-block's "stuck", and "you cannot stand it" by the posture entry.
    {
      id: "arousal-none",
      examples: ["you are not aroused", "your arousal fades", "you feel no desire"],
      permission: "arousalControl",
      patterns: [
        /\byou are (?:not|no longer) (?:\w+ ){0,2}(?:aroused|turned on|excited|horny|needy)\b/,
        /\byour (?:arousal|excitement|need|desire|heat|wanting) (?:is gone|fades|drains away|goes away|disappears|leaves you)\b/,
        /\byou feel no (?:arousal|desire|need|excitement)\b/,
        /\byou (?:do not|will not) (?:want|need) (?:it|anything|me)\b/
      ],
      run: () => applyArousal("none")
    },
    {
      id: "arousal-light",
      examples: ["you are lightly aroused", "you feel a little warm"],
      permission: "arousalControl",
      patterns: [
        /\byou are (?:only |just )?(?:lightly|slightly|mildly|barely|a little|a bit) (?:aroused|turned on|excited|warm|horny)\b/,
        /\byou feel (?:a little|a bit|slightly|lightly) (?:aroused|warm|excited|horny)\b/,
        /\byou are (?:just )?(?:starting|beginning) to (?:feel it|get (?:warm|aroused|excited))\b/,
        /\ba (?:little|small|faint) (?:warmth|heat) (?:builds|starts|begins|settles)\b/
      ],
      run: () => applyArousal("light")
    },
    {
      id: "arousal-high",
      examples: ["you are very aroused", "you are desperate", "you need it badly"],
      permission: "arousalControl",
      patterns: [
        /\byou are (?:\w+ )?(?:very|highly|deeply|so|extremely|badly|terribly|painfully) (?:aroused|turned on|excited|horny|needy)\b/,
        /\byou (?:are|feel) (?:\w+ )?(?:aching|burning|desperate|needy)\b/,
        /\byou (?:want|need) (?:it|this|me|to come|to cum) (?:badly|so much|desperately|now)\b/,
        /\byour (?:arousal|need|heat|desire) (?:climbs|builds|floods you|takes over)\b/
      ],
      run: () => applyArousal("high")
    },
    {
      id: "arousal-full",
      examples: ["you are right on the edge", "you are so close"],
      permission: "arousalControl",
      patterns: [
        /\byou are (?:fully|completely|totally|utterly) (?:aroused|turned on)\b/,
        /\byou are (?:\w+ ){0,2}(?:on|at) the (?:very )?(?:edge|brink)\b/,
        /\byou are (?:so close|almost there|about to (?:come|cum|burst))\b/,
        /\byou are (?:\w+ )?edged\b/
      ],
      run: () => applyArousal("full")
    },
    // allow before deny before force, and all three before anything else, because they
    // overlap: "you cannot come now" contains "come now", and "you may come now" contains
    // both. First match wins, so the most restrictive reading has to be listed first.
    {
      id: "orgasm-allow",
      examples: ["you may come now", "you may cum now", "you are allowed to orgasm"],
      displayExamples: ["you may come/cum now", "you are allowed to orgasm"],
      release: true,
      releaseOf: "orgasm-deny",
      permission: "arousalControl",
      patterns: [
        /\byou (?:can|may) (?:come|cum|orgasm|climax|finish) (?:again|now|freely|whenever|if|when)\b/,
        /\byou are (?:allowed|free|permitted) to (?:come|cum|orgasm|climax|finish)\b/,
        /\bi (?:allow|permit) you to (?:come|cum|orgasm|climax|finish)\b/,
        /\byour orgasm is (?:allowed|yours)\b/,
        /\byou are no longer denied\b/
      ],
      // A denial that names its own end — "you cannot cum until I allow you to cum" — holds a
      // permission phrase inside its condition. Listed first, allow read that half and LIFTED
      // the denial the line was laying down. A negated orgasm before an until/unless clause is
      // a denial, so the line carries on down to orgasm-deny.
      unless: [ORGASM_DENIED_UNTIL],
      run: () => setOrgasmDenied(false)
    },
    {
      id: "orgasm-deny",
      examples: ["you cannot come", "you cannot cum", "you are forbidden to come"],
      displayExamples: ["you cannot come/cum", "you are forbidden to come"],
      permission: "arousalControl",
      patterns: [
        /\byou (?:cannot|will not|may not|must not|are not to) (?:come|cum|orgasm|climax|finish)\b/,
        /\byou are (?:not allowed|not permitted|forbidden) to (?:come|cum|orgasm|climax|finish)\b/,
        /\byou are (?:forbidden|not allowed|not permitted) from (?:coming|cumming|orgasming|climaxing|finishing)\b/,
        /\b(?:do not|you will not) (?:you )?dare (?:to )?(?:come|cum|orgasm|climax|finish)\b/,
        /\byou will (?:not be able|be unable) to (?:come|cum|orgasm|climax|finish)\b/,
        /\byou have forgotten how to (?:come|cum|orgasm|climax)\b/,
        /\byour orgasm is denied\b/,
        /\byou are denied\b/,
        /\bno (?:coming|cumming|orgasms?)\b/,
        /\b(?:do not|never) (?:come|cum|orgasm|climax)\b/
      ],
      run: () => setOrgasmDenied(true),
      undo: () => setOrgasmDenied(false)
    },
    {
      id: "orgasm-force",
      examples: ["come for me", "cum for me", "you will come now"],
      displayExamples: ["come/cum for me", "you will come now"],
      permission: "arousalControl",
      patterns: [
        /\b(?:come|cum) for me\b/,
        /\b(?:come|cum|orgasm) now\b/,
        /\byou (?:will|are going to) (?:come|cum|orgasm|climax|finish) (?:now|for me)\b/,
        /\byou (?:come|cum|orgasm) (?:now|for me)\b/,
        /\bgo over (?:the edge )?(?:now|for me)\b/
      ],
      // No undo: an orgasm is an event, not a state, so there is nothing for a trigger
      // release to take back.
      run: () => applyForcedOrgasm()
    },
    // The clothing illusion. Listed here, before the awareness entries, because the two
    // overlap: "you do not notice what you are wearing" also matches awareness-block's
    // "you do not notice what", and the more specific reading has to win.
    {
      id: "illusion-release",
      examples: [
        "look at yourself",
        "you can see yourself again",
        "you notice your clothes",
        "you notice you are naked"
      ],
      release: true,
      releaseOf: "illusion-block",
      permission: "illusionControl",
      patterns: [
        /\byou (?:can|may) (?:see|tell) (?:what|how) you are (?:wearing|dressed)\b/,
        /\byou (?:can|may) see yourself (?:again|properly|clearly)\b/,
        /\byou (?:see|notice) yourself as you (?:really |actually )?are\b/,
        // "again" was mandatory on the next one and a qualifier was mandatory on the
        // last, so "you notice your clothes" and a bare "look at yourself" — two of the
        // most natural ways to say this — matched nothing at all.
        /\byou (?:notice|see|feel) your (?:clothes|clothing|outfit)\b/,
        /\byou (?:can|may) tell what you have on\b/,
        /\blook (?:down )?at yourself\b/,
        /\byou (?:notice|see|realise|realize) (?:that )?you are (?:naked|undressed|bare|dressed)\b/,
        /\byou (?:notice|see) what (?:you are wearing|is missing)\b/
      ],
      run: () => clearIllusion()
    },
    {
      id: "illusion-block",
      examples: ["you cannot tell what you are wearing", "your clothes look the same to you"],
      permission: "illusionControl",
      // The first suggestion to carry a trust threshold, and still the only one. Checked
      // against relationship trust alone — the arousal floor must never reach a feature
      // that lies to someone about their own state. See ILLUSION_TRUST_THRESHOLD above for
      // why the number is 65 rather than the 70 this table originally called for.
      patterns: [
        /\byou cannot (?:tell|see|remember) (?:what|how) you are (?:wearing|dressed)\b/,
        /\byou (?:do not|will not|cannot) notice (?:what|how) you are (?:wearing|dressed)\b/,
        /\byou (?:do not|will not|cannot) notice your (?:clothes|clothing|outfit)\b/,
        /\byou (?:cannot|do not) (?:tell|see) what you have on\b/,
        /\byour (?:clothes|clothing|outfit) (?:look|looks|stay|stays) the same to you\b/,
        /\byou look the same to yourself\b/,
        /\bnothing about you (?:changes|has changed)\b/,
        /\byou (?:do not|cannot) see yourself change\b/,
        /\byou will (?:not be able|be unable) to (?:tell|see) (?:what|how) you are (?:wearing|dressed)\b/
      ],
      run: () => freezeAppearance() ? void 0 : void 0,
      undo: () => clearIllusion()
    },
    {
      id: "movement-release",
      examples: ["you can move again", "your body is your own"],
      release: true,
      releaseOf: "movement-block",
      permission: "movementRestriction",
      patterns: [
        /\byou (can|may) move\b/,
        /\byou are (free|able|allowed) to move\b/,
        /\byou are no longer (frozen|paralyzed|rooted|immobile|still)\b/,
        /\byou (can|may) move (again|now|freely)\b/,
        /\bmove (again|freely)\b/,
        /\byour body is your own\b/
      ],
      run: () => {
        removeEffect("Freeze");
      }
    },
    {
      id: "movement-block",
      examples: ["you cannot move", "stay still", "you are frozen"],
      permission: "movementRestriction",
      patterns: [
        // The optional (\w+ ) throughout lets one adverb slip in without needing a
        // separate pattern for it — "you are completely frozen", "you cannot even move".
        /\byou cannot (\w+ )?move\b/,
        /\byou are (unable|not able) to move\b/,
        /\byou are (\w+ )?(frozen|paralyzed|rooted|immobile|stuck)\b/,
        /\b(do not|never) move\b/,
        /\b(stay|hold|remain) (still|frozen|put)\b/,
        /\b(stay|remain) where you are\b/,
        /\byour body (will not|does not|cannot) (move|respond|obey)\b/,
        /\byou (cannot|will not) move (a muscle|an inch|at all)\b/,
        // Future phrasing, natural when building a trigger: "when I say sleepy time,
        // you will not be able to move". Same effect either way — the tense is for the
        // hypnotist's benefit, not a different mechanic.
        /\byou will (not be able|be unable) to move\b/,
        /\byou will not move\b/
      ],
      run: () => {
        applyEffect("Freeze");
      },
      undo: () => removeEffect("Freeze")
    },
    // Follow / leash. Release listed first, as everywhere: "you may leave" must win over the
    // block's verbs before the block gets a look. Deliberately no "come with me" — that would
    // collide with the orgasm "come" family, which is listed earlier and would swallow it.
    {
      id: "follow-release",
      examples: ["you can leave", "you don't have to follow me", "you are free to go"],
      release: true,
      releaseOf: "follow-block",
      permission: "followControl",
      patterns: [
        /\byou (?:can|may) (?:leave|go)(?: now| freely)?\b/,
        /\byou are (?:free|allowed) to (?:leave|go|wander|walk away)\b/,
        /\byou (?:can|may) (?:walk away|wander off|go your own way)\b/,
        /\byou (?:do not|don't) have to (?:follow|stay)(?: me| close| near)?\b/,
        /\byou no longer (?:have to|need to) (?:follow|stay near me|stay close)\b/,
        /\bstay (?:wherever|where) you (?:like|want|please)\b/
      ],
      run: () => {
        releaseFollow();
      }
    },
    {
      id: "follow-block",
      examples: ["follow me", "stay close to me", "you cannot leave my side"],
      permission: "followControl",
      patterns: [
        /\bfollow me\b/,
        /\byou (?:will|must) follow(?: me)?\b/,
        /\byou follow (?:me|wherever i go)\b/,
        /\bstay (?:close|near)\b/,
        /\bstay (?:at|by) my (?:side|heel)\b/,
        /\byou (?:cannot|can't|will not|won't) (?:leave|walk away from) (?:my side|me)\b/,
        /\byou (?:belong|stay) (?:at|by) my (?:side|heel|feet)\b/,
        /\bheel\b/
      ],
      run: () => {
        applyFollow(currentHypnotistId());
      },
      undo: () => releaseFollow()
    },
    {
      id: "clothing-release",
      examples: ["you can change your clothes"],
      release: true,
      releaseOf: "clothing-block",
      permission: "clothingRestriction",
      patterns: [
        /\byou (can|may) (change|remove|touch|adjust) your (clothes|clothing|outfit)\b/,
        /\byou are (free|able|allowed) to (change|dress|undress)\b/,
        /\byou (can|may) (dress|undress)\b/,
        /\byour (clothes|clothing|outfit) are yours again\b/
      ],
      run: () => {
        removeEffect("BlockWardrobe");
      }
    },
    {
      id: "clothing-block",
      examples: ["you cannot change your clothes", "leave your clothes alone"],
      permission: "clothingRestriction",
      patterns: [
        /\byou cannot (change|remove|take off|touch|adjust) your (clothes|clothing|outfit)\b/,
        /\byou cannot (dress|undress|strip|get dressed|get undressed)\b/,
        /\byou are (unable|not able) to (change|remove) your (clothes|clothing|outfit)\b/,
        /\byour (clothes|clothing|outfit) (stay|stays|will stay|must stay|are staying)\b/,
        /\b(do not|never) (touch|change|remove|adjust) your (clothes|clothing|outfit)\b/,
        /\bleave your (clothes|clothing|outfit) alone\b/,
        /\byou have forgotten how to (dress|undress|change)\b/,
        /\byou will (not be able|be unable) to (change|remove|touch) your (clothes|clothing|outfit)\b/
      ],
      run: () => {
        applyEffect("BlockWardrobe");
      },
      undo: () => removeEffect("BlockWardrobe")
    },
    // Taking clothes OFF, as opposed to clothing-block above, which is being unable to change
    // them. ORDER IS LOAD-BEARING: these sit AFTER clothing-block so that "you cannot undress"
    // and "you cannot strip" are read as restrictions rather than as instructions. First match
    // wins, and the negated forms have to get there first.
    //
    // "all-at-once" is listed first because "take everything off" contains "take", and the
    // single-garment patterns must not eat it. Same first-match-wins rule as releases.
    {
      id: "undress-all",
      examples: ["take everything off", "strip"],
      permission: "undressControl",
      patterns: [
        /\btake (everything|it all) off\b/,
        /\btake off (everything|all your clothes)\b/,
        /\b(strip|undress) (completely|entirely|all the way)\b/,
        /\byou are (getting|going) completely undressed\b/,
        /\bremove (everything|all your clothes)\b/,
        /\bnothing stays on\b/,
        // Bare, and safe to be bare: the name gate already requires the line to address
        // the subject, so "comic strip" only fires if somebody says "Missy, comic strip".
        /\bstrip\b/
      ],
      unless: UNDRESS_IS_THE_OBJECT,
      run: () => applyUndress(Infinity)
    },
    {
      id: "undress",
      examples: ["take something off", "undress"],
      permission: "undressControl",
      patterns: [
        /\btake (something|a piece|one thing|another|it) off\b/,
        /\btake off (something|a piece|one thing|another)\b/,
        /\b(you )?(start|begin) (to )?undress(ing)?\b/,
        /\byou (want|need) to undress\b/,
        /\bundress (for me|yourself|now)\b/,
        /\bundress\b/,
        /\btake your clothes off\b/,
        /\bremove (a|one) (piece|garment|item)\b/
      ],
      unless: UNDRESS_IS_THE_OBJECT,
      run: () => applyUndress(1)
    },
    // PER-CATEGORY awareness, and they sit BEFORE the broad pair below because the broad
    // block's /you (do not|will not) notice/ has no right-hand anchor and would take "you will
    // not notice your clothing" first — which is exactly what happened in play: the line
    // meant for clothing took every permitted category and reported the broad thing. Touch
    // already had its own pair (touch-block / touch-release, further down); clothing and
    // bondage did not, so the only way to reach either alone was to have unticked the others.
    //
    // Releases before blocks, as everywhere: "you notice your clothes again" contains
    // "notice your clothes".
    //
    // AND THE CLOTHING PAIR MUST NOT SOUND LIKE THE ILLUSION. "You will not notice your
    // clothing" is an illusion-block pattern — listed above, on purpose, because "notice" there
    // reads as perception and the more specific feature wins. That is the line DW said in play
    // at Drifting, and it was refused for depth by the illusion, not ignored by awareness. So
    // every phrasing here names the CHANGE or the ACT — being undressed, clothes changing —
    // rather than the clothes themselves, and the suite pins the illusion's claim on the other
    // wording so nobody "fixes" the collision by moving it.
    {
      id: "clothing-awareness-release",
      examples: ["you notice being undressed again", "clothing changes register again"],
      release: true,
      releaseOf: "clothing-awareness-block",
      permission: "suppressClothing",
      patterns: [
        /\byou notice (being|when you are) (dressed|undressed|redressed|changed|stripped) again\b/,
        /\byou notice changes to your (clothes|clothing|outfit)( again)?\b/,
        /\b(clothing|clothes|outfit) changes (register|reach you)( again)?\b/
      ],
      run: () => setSuppressed("clothing", false)
    },
    {
      id: "clothing-awareness-block",
      examples: ["you will not notice being undressed", "changes to your clothes go unnoticed"],
      permission: "suppressClothing",
      patterns: [
        /\byou (do not|will not|cannot) notice (being|when you are) (dressed|undressed|redressed|changed|stripped)\b/,
        /\byou (do not|will not|cannot) notice changes to your (clothes|clothing|outfit)\b/,
        /\byou (do not|will not|cannot) notice (anyone|someone|people|me) (changing|dressing|undressing|stripping) you\b/,
        // "...when I strip you" — the phrasing the undress entries used to take, and strip her.
        /\byou (do not|will not|cannot) notice (when|while|as|if) (i|we|they|he|she|someone|anyone|people) (strip|strips|undress|undresses|change|changes|dress|dresses) you\b/,
        /\b(clothing|clothes|outfit) changes go unnoticed\b/,
        /\bchanges to your (clothes|clothing|outfit) go unnoticed\b/
      ],
      run: () => setSuppressed("clothing", true),
      undo: () => setSuppressed("clothing", false)
    },
    {
      id: "bondage-awareness-release",
      examples: ["you notice the ropes again"],
      release: true,
      releaseOf: "bondage-awareness-block",
      permission: "suppressBondage",
      patterns: [
        /\byou notice (the |your |any )?(ropes|restraints|bondage|bindings|cuffs) again\b/,
        /\byou (notice|feel) being (tied|bound|restrained) again\b/
      ],
      run: () => setSuppressed("bondage", false)
    },
    {
      id: "bondage-awareness-block",
      examples: ["you will not notice the ropes", "you do not notice being tied"],
      permission: "suppressBondage",
      patterns: [
        /\byou (do not|will not|cannot) notice (the |your |any )?(ropes|restraints|bondage|bindings|cuffs)\b/,
        /\byou (do not|will not|cannot) notice being (tied|bound|restrained)\b/
      ],
      run: () => setSuppressed("bondage", true),
      undo: () => setSuppressed("bondage", false)
    },
    {
      // The broad one: clothing, bondage and touch together. Each category is still
      // applied only if separately permitted — saying it doesn't override a box the
      // subject left unchecked.
      id: "awareness-release",
      examples: ["you notice everything again"],
      release: true,
      releaseOf: "awareness-block",
      permission: ["suppressClothing", "suppressBondage", "suppressActivities"],
      patterns: [
        /\byou notice (everything|things|them|it) again\b/,
        /\byou (notice|feel) what (happens|is happening|is done) to you\b/,
        // "awake" deliberately NOT here — "you are awake again" should end the trance,
        // not merely restore awareness of clothing changes. It belongs to wake.
        /\byou are aware (again|to it)\b/,
        // "You can notice" / "you may notice" needs an object that means awareness coming
        // BACK. It used to be bare, and ordinary patter starts that way far more often than a
        // release does: "you may notice a warmth spreading" matched here and silently lifted
        // clothing, bondage and touch hiding, the illusion and numbness, mid-scene, with
        // nothing said to the hypnotist. That was the "inconsistent suppression" and the
        // "awareness cancels the illusion" of DW's 2026-09-22 list, one cause for both.
        /\byou (can|may) notice (again|everything|things|it all)\b/,
        /\byou (can|may) notice (what|anything that) (happens|is happening|is done) to you\b/
      ],
      run: () => {
        setSuppressed("clothing", false);
        setSuppressed("bondage", false);
        setSuppressed("activity", false);
        clearIllusion();
        setNumb(false);
      }
    },
    {
      id: "awareness-block",
      examples: ["you notice nothing", "you are unaware"],
      permission: ["suppressClothing", "suppressBondage", "suppressActivities"],
      patterns: [
        /\byou notice nothing\b/,
        /\byou (do not|will not) notice\b/,
        /\byou (cannot|do not) notice (anything|what)\b/,
        /\bnothing (that happens|done) to you (matters|registers)\b/,
        /\byou are (unaware|oblivious)\b/
      ],
      run: () => {
        const { applied: applied2 } = reachableCategories(
          ["suppressClothing", "suppressBondage", "suppressActivities"],
          getFeatures()
        );
        if (applied2.includes("suppressClothing")) setSuppressed("clothing", true);
        if (applied2.includes("suppressBondage")) setSuppressed("bondage", true);
        if (applied2.includes("suppressActivities")) setSuppressed("activity", true);
      }
    },
    // The touch pair and the numbness pair below say different things and were one entry
    // until v0.39.0. "Ignore my touches" is about ATTENTION — it reaches you, you do not
    // attend to it, and your arousal still climbs with no visible cause, which is the good
    // half of the mechanic. "You cannot feel my touch" is about SENSATION, and bundling the
    // two made it a lie: the subject was told she felt nothing while her own arousal meter
    // told her otherwise. Same class of bug as the illusion surviving "you notice
    // everything again" in v0.38.2 — a suggestion the subject can directly observe to be
    // false.
    //
    // Numbness sits under arousalControl rather than suppressActivities, per DW. Consenting
    // to "you may hide when I am touched" is not consenting to "my body may be made not to
    // respond", and the two are worth being asked separately.
    {
      id: "touch-release",
      examples: ["you notice my touches again", "you register my touch"],
      release: true,
      releaseOf: "touch-block",
      permission: "suppressActivities",
      // "You can notice my touch" used to be left out, because awareness-release's bare
      // /you (can|may) notice/ took it first. That pattern was narrowed in v0.82.0 (it was
      // also taking ordinary patter), so the obvious phrasing lives here now.
      patterns: [
        /\byou (can|may) (notice|register) (my|his|her|their) (touch|touches)\b/,
        /\byou notice (my|his|her|their) (touch|touches) again\b/,
        /\byou (notice|register) (my|his|her|their) (touch|touches)\b/,
        /\byou (will |)stop ignoring (my|his|her|their) (touch|touches)\b/
      ],
      run: () => setSuppressed("activity", false)
    },
    {
      id: "touch-block",
      examples: ["you will ignore my touches"],
      permission: "suppressActivities",
      patterns: [
        /\byou (will |)ignore (my|his|her|their) (touch|touches)\b/,
        /\bignore (my|his|her|their) (touch|touches)\b/
      ],
      run: () => setSuppressed("activity", true),
      undo: () => setSuppressed("activity", false)
    },
    {
      id: "numb-release",
      examples: ["you can feel my touch again", "you can feel again"],
      release: true,
      releaseOf: "numb-block",
      permission: "arousalControl",
      patterns: [
        /\byou (can|may) feel (my|his|her|their) (touch|touches|hands)\b/,
        /\byou feel (my|his|her|their) (touch|touches) again\b/,
        /\byou (can|may) feel (me|it|again|things again|everything again)\b/,
        /\byour (skin|body) (responds|reacts|works|feels)( again)?\b/,
        /\byou are not numb\b/,
        /\btouch reaches you again\b/
      ],
      // Generous, like every release: this also lifts the message-hiding above. Being told
      // you can feel someone's touch again while the touches are still being hidden from
      // you leaves the subject in a state the words deny — and handing something back is
      // always allowed to undo more than taking it away applies.
      run: () => {
        setNumb(false);
        setSuppressed("activity", false);
      }
    },
    {
      id: "numb-block",
      examples: ["you cannot feel my touch", "you feel nothing when I touch you"],
      permission: "arousalControl",
      patterns: [
        /\byou (cannot|do not) feel (my|his|her|their) (touch|touches|hands)\b/,
        /\b(my|his|her|their) (touch|touches) (do not|does not) reach you\b/,
        /\byou (cannot|do not) feel (me|my hands|anything|it)\b/,
        /\byou feel nothing\b/,
        /\byou (are|go) numb\b/,
        /\byour (skin|body) (cannot|does not) feel\b/,
        /\btouch (cannot|does not) reach you\b/
      ],
      run: () => setNumb(true),
      undo: () => setNumb(false)
    },
    {
      id: "speech-release",
      examples: ["you can speak again", "your voice is back"],
      release: true,
      releaseOf: "speech-block",
      permission: "speechRestriction",
      patterns: [
        /\byou (can|may) (speak|talk)\b/,
        /\byou are (free|able|allowed) to (speak|talk)\b/,
        /\byour voice (is back|returns|is yours)\b/,
        /\b(speak|talk) (again|freely)\b/,
        /\byou have your voice back\b/
      ],
      run: () => setSpeechBlocked(false)
    },
    {
      id: "speech-block",
      examples: ["you cannot speak", "stay silent", "not a word"],
      permission: "speechRestriction",
      patterns: [
        /\byou cannot (\w+ )?(speak|talk)\b/,
        /\byou are (unable|not able) to (speak|talk)\b/,
        /\b(do not|never) (speak|talk)\b/,
        /\byou have (no voice|lost your voice)\b/,
        /\byour voice is gone\b/,
        /\b(stay|remain|be) (silent|quiet)\b/,
        /\bnot a (word|sound)\b/,
        /\byou have forgotten how to (speak|talk)\b/,
        /\byou will (not be able|be unable) to (speak|talk)\b/,
        /\byou will not (speak|talk)\b/,
        /(?<!\bi )(?<!\bwe )\bsilence\b/
      ],
      run: () => setSpeechBlocked(true),
      undo: () => setSpeechBlocked(false)
    },
    ...POSE_SUGGESTIONS,
    {
      id: "stand",
      examples: ["stand", "get up", "on your feet"],
      release: true,
      releaseOf: STANCE_IDS,
      permission: "postureControl",
      // Bare "stand" and "rise" are matched now that a suggestion also has to name the
      // subject — that gate does most of the false-positive work, so these no longer have
      // to be excluded wholesale. The narrow guards that remain cover what the name gate
      // doesn't: "I can't stand it, Missy" (normalised to "cannot stand") and the
      // hypnotist narrating themselves ("I stand beside you, Missy").
      patterns: [
        /(?<!cannot )(?<!\bi )(?<!\bwe )\bstand\b/,
        /(?<!\bi )(?<!\bwe )\brise\b/,
        /(?<!\bto )(?<!\bi )(?<!\bwe )\bget up\b/,
        /\b(get|rise) to your feet\b/,
        /\bon your feet\b/
      ],
      // Clears the legs only now: "stand" no longer drops arms held behind the back.
      run: () => setSuggestedPose(null, "stance") ? void 0 : "pose-blocked"
    },
    {
      id: "kneel",
      examples: ["kneel", "on your knees"],
      permission: "postureControl",
      // Guarded so the hypnotist narrating their own action ("I kneel beside you") doesn't
      // put the subject on the floor. "I want you to kneel" still lands — the guard is on
      // the pronoun immediately before the verb, not anywhere in the line.
      patterns: [
        /(?<!\bi )(?<!\bwe )\bkneel\b/,
        /\b(get|down|drop) on your knees\b/,
        /\bon your knees\b/,
        /\bdrop to your knees\b/
      ],
      run: () => applyPose("Kneel"),
      undo: () => clearSuggestedPose("stance", "Kneel")
    }
  ];
  function isSelfReferential(text) {
    return /^(i|we)\b/.test(text) && !/\byou\b/.test(text);
  }
  function mentionsAnyName(content, names) {
    const text = normalize(content);
    const cleaned = names.map((n) => normalize(String(n ?? ""))).filter((n) => n.length > 0);
    if (cleaned.length === 0) return false;
    return cleaned.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text));
  }
  function playerOwnNames() {
    return [Player?.Name, Player?.Nickname].filter(Boolean);
  }
  var VOCATIVE_FILLER = /* @__PURE__ */ new Set(["ok", "okay", "now", "so", "hey", "hi", "well", "alright", "right", "but", "and", "then", "please", "listen"]);
  var CLAUSE_SPLIT = /[,;.!?:\n\r]+|\band\b|\bthen\b/i;
  var OBJECT_MARKERS = /* @__PURE__ */ new Set([
    "at",
    "to",
    "with",
    "about",
    "like",
    "for",
    "from",
    "of",
    "on",
    "near",
    "beside",
    "behind",
    "toward",
    "towards",
    "into",
    "onto",
    "against",
    "between",
    "around",
    "over",
    "under",
    "by",
    "as",
    "than",
    "or",
    "nor",
    "past",
    "beyond",
    "beneath",
    "above",
    "below",
    "off",
    "through"
  ]);
  var OBJECT_VERBS = /* @__PURE__ */ new Set([
    "grope",
    "squeeze",
    "fondle",
    "pinch",
    "spank",
    "smack",
    "slap",
    "scratch",
    "tickle",
    "pull",
    "tug",
    "choke",
    "massage",
    "knead",
    "nibble",
    "lick",
    "kiss",
    "suck",
    "bite",
    "pet",
    "finger",
    "masturbate",
    "pleasure",
    "caress",
    "stroke",
    "touch",
    "feel",
    "rub"
  ]);
  var bareWord = (w) => w.replace(/[^A-Za-z]/g, "").toLowerCase();
  function splitSegments(content, known) {
    const isName = (w) => known.has(bareWord(w));
    const isFiller = (w) => VOCATIVE_FILLER.has(bareWord(w));
    const out = [];
    for (const chunk of String(content ?? "").split(CLAUSE_SPLIT)) {
      const seg = chunk.trim();
      if (!seg) continue;
      let words = seg.split(/\s+/);
      while (words.length) {
        let i = 0;
        while (i < words.length && isFiller(words[i])) i++;
        const lead = [];
        while (i < words.length && isName(words[i])) lead.push(bareWord(words[i++]));
        let cut = -1;
        for (let j = i + 1; j < words.length; j++) {
          const before = bareWord(words[j - 1]);
          if (isName(words[j]) && !OBJECT_MARKERS.has(before) && !OBJECT_VERBS.has(before)) {
            cut = j;
            break;
          }
        }
        const end = cut === -1 ? words.length : cut;
        out.push({ lead, body: words.slice(i, end).join(" ") });
        if (cut === -1) break;
        words = words.slice(cut);
      }
    }
    return out;
  }
  function scopeToAddressee(content, mine, others2) {
    const clean = (list) => list.map((n) => bareWord(String(n ?? ""))).filter((n) => n.length > 0);
    const mineSet = new Set(clean(mine));
    const otherSet = new Set(clean(others2));
    for (const n of mineSet) otherSet.delete(n);
    if (mineSet.size === 0 || otherSet.size === 0) return { text: content, scoped: false, ambiguous: false };
    const known = /* @__PURE__ */ new Set([...mineSet, ...otherSet]);
    const segments = splitSegments(content, known);
    const namedOther = segments.some((s) => s.lead.some((n) => otherSet.has(n)));
    if (!namedOther) return { text: content, scoped: false, ambiguous: false };
    let current = [];
    let prevWasVocative = false;
    let namedMe = false;
    const owned = [];
    let pending = [];
    let justClaimed = [];
    for (const seg of segments) {
      if (seg.lead.some((n) => mineSet.has(n))) namedMe = true;
      if (!seg.body) {
        if (pending.length) {
          for (const p of pending) p.owner = [...seg.lead];
          justClaimed = pending;
          pending = [];
          current = [];
        } else if (prevWasVocative && justClaimed.length) {
          for (const p of justClaimed) p.owner = [...p.owner, ...seg.lead];
        } else {
          current = prevWasVocative ? [...current, ...seg.lead] : seg.lead;
          justClaimed = [];
        }
        prevWasVocative = true;
        continue;
      }
      prevWasVocative = false;
      justClaimed = [];
      if (seg.lead.length) current = seg.lead;
      const entry = { owner: [...current], body: seg.body };
      owned.push(entry);
      if (!current.length) pending.push(entry);
    }
    const floating = owned.some((o) => o.owner.length === 0);
    const forMe = owned.filter((o) => o.owner.some((n) => mineSet.has(n)));
    if (floating) return { text: null, scoped: true, ambiguous: true };
    if (forMe.length) {
      const spoken = mine.map(String).find((n) => mineSet.has(bareWord(n))) ?? "";
      const body2 = forMe.map((o) => o.body).join(". ");
      return { text: `${spoken}, ${body2}`.trim(), scoped: true, ambiguous: false };
    }
    if (namedMe) return { text: null, scoped: true, ambiguous: true };
    return { text: null, scoped: true, ambiguous: false };
  }
  function otherRoomNames(speaker) {
    const mine = new Set(playerOwnNames().map((n) => bareWord(n)));
    const roster = Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter : [];
    const names = [];
    for (const c of roster) {
      if (!c || c.MemberNumber === Player?.MemberNumber || c.MemberNumber === speaker) continue;
      for (const n of [c.Name, c.Nickname]) {
        if (typeof n === "string" && n.trim() && !mine.has(bareWord(n))) names.push(n);
      }
    }
    return names;
  }
  function matchSuggestion(content) {
    const text = normalize(content);
    if (!text || isSelfReferential(text)) return null;
    for (const suggestion of SUGGESTIONS) {
      if (suggestion.unless?.some((p) => p.test(text))) continue;
      if (suggestion.patterns.some((p) => p.test(text))) return suggestion.id;
    }
    return null;
  }
  var PART_BLOCK = [
    /\byou (?:cannot|will not|do not) touch your ([a-z]+)\b/,
    // Future phrasing, the natural way to say it while building a trigger. Without this,
    // "you will not be able to touch your breasts" matched nothing at all and looked like
    // the command had simply been ignored.
    /\byou will (?:not be able|be unable) to touch your ([a-z]+)\b/,
    /\b(?:do not|never) touch your ([a-z]+)\b/
  ];
  var PART_RELEASE = [
    /\byou (?:can|may) touch your ([a-z]+)\b/,
    /\byour ([a-z]+) (?:are|is) yours again\b/
  ];
  var SELF_BLOCK = [
    /\byou (?:cannot|will not|do not) touch yourself\b/,
    /\byou will (?:not be able|be unable) to touch yourself\b/,
    /\b(?:do not|never) touch yourself\b/
  ];
  var SELF_RELEASE = [/\byou (?:can|may) touch yourself\b/];
  function matchBodyPartCommand(content) {
    const text = normalize(content);
    if (!text || isSelfReferential(text)) return null;
    for (const re of SELF_RELEASE) if (re.test(text)) return { word: "yourself", groups: [], block: false, all: true };
    for (const re of SELF_BLOCK) if (re.test(text)) return { word: "yourself", groups: [], block: true, all: true };
    for (const [patterns, block] of [
      [PART_RELEASE, false],
      [PART_BLOCK, true]
    ]) {
      for (const re of patterns) {
        const m = re.exec(text);
        const word = m?.[1];
        const groups = word ? BODY_PARTS[word] : void 0;
        if (groups) return { word, groups, block, all: false };
      }
    }
    return null;
  }
  function tierLabelFor(permission) {
    const keys = Array.isArray(permission) ? permission : [permission];
    const tiers = keys.map((k) => requiredDepth(k));
    const shallowest = Math.min(...tiers);
    return Number.isFinite(shallowest) ? tierLabel(tierOf(shallowest)) : void 0;
  }
  function suggestionHelp() {
    return SUGGESTIONS.map((s) => ({
      id: s.id,
      permission: Array.isArray(s.permission) ? s.permission.join(" / ") : String(s.permission),
      examples: s.examples,
      display: s.displayExamples ?? s.examples,
      release: !!s.release,
      depthTier: s.release ? void 0 : tierLabelFor(s.permission)
    }));
  }
  function describeMatch(content) {
    const id = matchSuggestion(content);
    if (!id) return "no match";
    return mentionsAnyName(content, playerOwnNames()) ? `${id} \u2014 would fire` : `${id} \u2014 but your name isn't in the line, so it would be ignored`;
  }
  var TRIGGER_START = [
    /\byour trigger (?:word|phrase) is (.+)$/,
    /\bthe trigger (?:word|phrase) is (.+)$/,
    /\byour (?:new )?trigger is (.+)$/,
    /\bwhen (?:i say|you hear) (.+)$/
  ];
  var TRIGGER_COMMIT = [/\bremember (?:the |this |that )?trigger\b/, /\bthe trigger is set\b/, /\block (?:it |that )?in\b/];
  var TRIGGER_CANCEL = [/\b(?:forget|cancel|never mind|nevermind) (?:the |that |this )?trigger\b/];
  function cleanPhrase(raw) {
    let phrase = raw.trim();
    for (const name of playerOwnNames()) {
      const n = normalize(String(name));
      if (!n) continue;
      phrase = phrase.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), " ");
    }
    return phrase.replace(/\s+/g, " ").trim();
  }
  function isTriggerSetupLine(sender, content) {
    if (!getFeatures().suppressTriggerSetup) return false;
    if (!isSessionActiveWith(sender)) return false;
    const line = scopeToAddressee(content, playerOwnNames(), otherRoomNames(sender)).text;
    if (line === null) return false;
    if (parseTriggerControl(line)) return true;
    if (!isRecording()) return false;
    return !!matchSuggestion(line) || !!matchBodyPartCommand(line) || !!matchActivityCommand(line);
  }
  function parseTriggerControl(content) {
    const text = normalize(content);
    if (!text || isSelfReferential(text)) return null;
    if (TRIGGER_CANCEL.some((p) => p.test(text))) return { kind: "cancel" };
    if (TRIGGER_COMMIT.some((p) => p.test(text))) return { kind: "commit" };
    for (const pattern of TRIGGER_START) {
      const match = pattern.exec(text);
      if (match) return { kind: "start", phrase: cleanPhrase(match[1]) };
    }
    return null;
  }
  function handleTriggerControl(sender, content) {
    const parsed = parseTriggerControl(content);
    if (!parsed) return false;
    if (!isSessionActiveWith(sender) || !mentionsAnyName(content, playerOwnNames())) return false;
    if (parsed.kind === "cancel") {
      if (isRecording()) {
        cancelRecording();
        tellPlayer("Whatever was being set aside comes apart again.");
      }
      return true;
    }
    if (parsed.kind === "commit") {
      if (!isRecording()) return false;
      const message = commitRecording(isTriggerInEffect);
      if (message) tellPlayer(message);
      return true;
    }
    const character = ChatRoomCharacter?.find((c) => c?.MemberNumber === sender);
    if (isRecording()) {
      renameRecording(sender, parsed.phrase, isTriggerInEffect);
      return true;
    }
    const line = beginRecording(sender, character?.Name ?? `#${sender}`, parsed.phrase, isTriggerInEffect);
    if (line) tellPlayer(line);
    return true;
  }
  var TRIGGER_STEP_BASE_MS = 1200;
  var TRIGGER_STEP_JITTER_MS = 800;
  function drainTriggerSteps(trigger, steps) {
    if (!steps.length) return;
    steps[0]();
    if (steps.length === 1) return;
    const key = `trigger-drain:${trigger.installedBy}:${trigger.phrase}`;
    let i = 1;
    const tick = () => {
      steps[i++]();
      if (i < steps.length) scheduleTimer(key, TRIGGER_STEP_BASE_MS + Math.random() * TRIGGER_STEP_JITTER_MS, tick);
    };
    scheduleTimer(key, TRIGGER_STEP_BASE_MS + Math.random() * TRIGGER_STEP_JITTER_MS, tick);
  }
  function fireTrigger(trigger) {
    if (!triggersArmed()) {
      log(`trigger "${trigger.phrase}" matched but triggers aren't armed`);
      return;
    }
    const features = getFeatures();
    const strength = triggerStrength(trigger);
    if (strength < TRIGGER_GHOST_THRESHOLD) {
      log(`trigger "${trigger.phrase}" is a ghost at strength ${strength} \u2014 no actions`);
      announce("trigger-ghost");
      noteTriggerFired(trigger);
      return;
    }
    const steps = [];
    let holding = 0;
    let compels = 0;
    let tooWeak = 0;
    for (const id of trigger.actions) {
      if (id.startsWith("touch:")) {
        if (!features.selfTouchControl) {
          log(`trigger "${trigger.phrase}": ${id} skipped, selfTouchControl not granted`);
          continue;
        }
        const word = id.slice("touch:".length);
        if (word !== "all" && !BODY_PARTS[word]) continue;
        holding++;
        steps.push(() => {
          if (word === "all") setAllSelfTouchBlocked(true);
          else setBodyPartBlocked(word, BODY_PARTS[word], true);
          announce(word === "all" ? "selftouch-applied" : "restriction-settles");
        });
        continue;
      }
      if (id.startsWith("act:")) {
        if (!features.compelActivity) {
          log(`trigger "${trigger.phrase}": ${id} skipped, compelActivity not granted`);
          continue;
        }
        if (!depthAllows("compelActivity", strength, strength)) {
          log(`trigger "${trigger.phrase}": ${id} too weak at ${strength}`);
          tooWeak++;
          continue;
        }
        compels++;
        steps.push(() => {
          if (!getFeatures().compelActivity) {
            log(`trigger "${trigger.phrase}": ${id} dropped mid-pace \u2014 compelActivity revoked`);
            return;
          }
          if (Player?.HasEffect?.("Freeze") && !hasOwnEffect("Freeze")) {
            log(`trigger "${trigger.phrase}": ${id} dropped mid-pace \u2014 a real restraint has them frozen`);
            return;
          }
          performActivityAction(id);
        });
        continue;
      }
      const suggestion = SUGGESTIONS.find((s) => s.id === id);
      if (!suggestion) continue;
      const blocked = permissionReason(suggestion, features);
      if (blocked) {
        log(`trigger "${trigger.phrase}": ${id} skipped, ${blocked}`);
        continue;
      }
      if (!depthAllows(keyFor(suggestion, features), strength, strength)) {
        log(`trigger "${trigger.phrase}": ${id} too weak at ${strength}`);
        tooWeak++;
        continue;
      }
      holding++;
      steps.push(() => announce(suggestion.run() || suggestion.id));
    }
    log(
      `trigger "${trigger.phrase}" firing ${steps.length} step(s) \u2014 ${holding} holding, ${compels} compel \u2014 at strength ${strength}${tooWeak ? ` (${tooWeak} too weak)` : ""}`
    );
    noteTriggerFired(trigger);
    if (holding) {
      markActive(timerKey(trigger));
      scheduleAutoRelease(trigger);
      saveForReconnect();
    }
    drainTriggerSteps(trigger, steps);
  }
  function keyFor(suggestion, features) {
    const keys = (Array.isArray(suggestion.permission) ? suggestion.permission : [suggestion.permission]).filter(
      (k) => features[k]
    );
    return keys[0] ?? (Array.isArray(suggestion.permission) ? suggestion.permission[0] : suggestion.permission);
  }
  var TRIGGER_RELEASE = [
    /\byou are released from (.+)$/,
    /\bi release you from (.+)$/,
    /\brelease (?:the )?trigger (.+)$/
  ];
  function undoTrigger(trigger) {
    for (const id of trigger.actions) {
      if (id.startsWith("touch:")) {
        const word = id.slice("touch:".length);
        if (word === "all") setAllSelfTouchBlocked(false);
        else if (BODY_PARTS[word]) setBodyPartBlocked(word, BODY_PARTS[word], false);
        continue;
      }
      SUGGESTIONS.find((s) => s.id === id)?.undo?.();
    }
    cancelTimer(timerKey(trigger));
    clearActive(timerKey(trigger));
    saveForReconnect();
    log(`released trigger "${trigger.phrase}" (${trigger.actions.length} actions undone)`);
  }
  function isTriggerInEffect(trigger) {
    return isActive(timerKey(trigger));
  }
  function triggerPhrasesVisible(fullRequested) {
    if (getFeatures().showTriggerWords) return true;
    return isTestingMode() && fullRequested;
  }
  function describeTriggerList(fullRequested) {
    pruneFadedTriggers(isTriggerInEffect);
    const all = listTriggers();
    if (!all.length) return ["no triggers planted"];
    const reveal = triggerPhrasesVisible(fullRequested);
    return all.map(
      (t, i) => `${i + 1}. ${reveal ? `"${t.phrase}"` : "(phrase hidden)"} \u2192 ${t.actions.join(", ")}  (by ${t.installedByName}, ${describeStrength(t)})${isTriggerInEffect(t) ? "  ** HOLDING YOU NOW **" : ""}`
    );
  }
  function timerKey(trigger) {
    return `trigger:${trigger.installedBy}:${trigger.phrase}`;
  }
  function scheduleAutoRelease(trigger) {
    const minutes = getTriggerDuration();
    cancelTimer(timerKey(trigger));
    if (minutes <= 0) return;
    scheduleTimer(timerKey(trigger), minutes * 6e4, () => {
      undoTrigger(trigger);
      tellPlayer("Whatever was holding you loosens on its own.");
    });
    log(`trigger "${trigger.phrase}" will release itself in ${minutes} min`);
  }
  function handleTriggerRelease(sender, content) {
    const text = normalize(content);
    if (!text || isSelfReferential(text)) return false;
    for (const pattern of TRIGGER_RELEASE) {
      const match = pattern.exec(text);
      if (!match) continue;
      const phrase = cleanPhrase(match[1]);
      const trigger = triggersReleasableBy(sender, phrase)[0];
      if (!trigger) {
        log(`release asked for "${phrase}" but no trigger of theirs matches`);
        return true;
      }
      undoTrigger(trigger);
      tellPlayer("Whatever was holding you lets go.");
      return true;
    }
    return false;
  }
  var REINFORCE = [
    /\b(?:that|the|your) triggers? (?:will |)(?:holds?|stays?|remains?|settles? deeper)\b/,
    /\breinforce (?:that|the|your) triggers?\b/,
    /\b(?:that|the|your) triggers? (?:is|are) (?:stronger|deeper) now\b/,
    /\blet (?:that|the|your) triggers? (?:settle|sink) deeper\b/
  ];
  function handleReinforcement(sender, content) {
    const text = normalize(content);
    if (!REINFORCE.some((p) => p.test(text))) return false;
    if (!getFeatures().triggerControl) {
      tellHypnotist(sender, '[trigger] Refused \u2014 they have not enabled "Triggers".');
      return true;
    }
    if (!isSessionActiveWith(sender)) {
      tellHypnotist(sender, "[trigger] Refused \u2014 reinforcing is a re-induction: they have to be under with you.");
      return true;
    }
    const count = reinforceTriggersBy(sender);
    if (!count) {
      tellHypnotist(sender, "[trigger] Nothing of yours is planted in them to reinforce.");
      return true;
    }
    tellHypnotist(sender, `[trigger] Reinforced ${count} trigger(s) back to full strength.`);
    announce("trigger-reinforced");
    return true;
  }
  function handleTriggerFiring(sender, content) {
    const text = normalize(content);
    if (!text) return false;
    const matched = triggersFiredBy(sender, text);
    if (!matched.length) return false;
    for (const trigger of matched) {
      if (installerHasSession(trigger)) {
        log(`trigger "${trigger.phrase}" suppressed \u2014 installer already has a live session`);
        continue;
      }
      fireTrigger(trigger);
    }
    return true;
  }
  var CARRY_LAST = [
    /\b(?:that|this|it) (?:will |)stays? with (?:you|her|him|them)\b/,
    /\byou will keep (?:that|this|it)\b/,
    /\b(?:that|this|it) (?:will |)(?:stay|stays|remain|remains) (?:with you )?(?:when|after) you wake\b/,
    /\byou will carry (?:that|this|it) with you\b/,
    /\b(?:that|this|it) (?:one |)stays\b/
  ];
  var CARRY_ALL = [
    /\ball of (?:this|that|it) (?:will |)stays? with you\b/,
    /\b(?:all|everything) (?:of it |)(?:will |)stays? with you\b/,
    /\byou will keep (?:all of |)(?:this|everything)\b/,
    /\beverything i (?:have |)told you stays\b/
  ];
  var CARRY_CANCEL = [
    /\b(?:this|that|it|none of it|nothing) will not stay with you\b/,
    /\bforget what i (?:said|told you)\b/,
    /\bnothing stays with you\b/
  ];
  function applyActionById(id) {
    if (id.startsWith("touch:")) {
      const word = id.slice("touch:".length);
      if (word === "all") setAllSelfTouchBlocked(true);
      else if (BODY_PARTS[word]) setBodyPartBlocked(word, BODY_PARTS[word], true);
      return;
    }
    SUGGESTIONS.find((s) => s.id === id)?.run();
  }
  function undoActionById(id) {
    if (id.startsWith("touch:")) {
      const word = id.slice("touch:".length);
      if (word === "all") setAllSelfTouchBlocked(false);
      else if (BODY_PARTS[word]) setBodyPartBlocked(word, BODY_PARTS[word], false);
      return;
    }
    SUGGESTIONS.find((s) => s.id === id)?.undo?.();
  }
  registerCarryHandlers(applyActionById, undoActionById);
  registerTriggerRecovery(
    () => listTriggers().filter((t) => isActive(timerKey(t))).map((t) => ({ key: timerKey(t), actions: t.actions, until: timerDeadline(timerKey(t)) })),
    (saved) => {
      const trigger = listTriggers().find((t) => timerKey(t) === saved.key);
      if (!trigger) {
        log(`recovery: trigger ${saved.key} no longer exists, nothing to restore`);
        return;
      }
      for (const id of saved.actions) {
        try {
          applyActionById(id);
        } catch (err) {
          warn(`recovery: could not re-apply "${id}":`, err);
        }
      }
      markActive(saved.key);
      const remaining = saved.until ? saved.until - Date.now() : 0;
      if (remaining > 0) {
        scheduleTimer(saved.key, remaining, () => {
          undoTrigger(trigger);
          tellPlayer("Whatever was holding you loosens on its own.");
        });
      }
      saveForReconnect();
      log(
        `recovery: trigger "${trigger.phrase}" restored with ${remaining > 0 ? `${Math.round(remaining / 6e4)} min left` : "no clock"}`
      );
    }
  );
  function handleCarryControl(sender, content) {
    const text = normalize(content);
    if (!text || isSelfReferential(text)) return false;
    if (CARRY_CANCEL.some((p) => p.test(text))) {
      if (!isCarrierOf(sender)) return false;
      if (releaseCarried("the hypnotist took it back")) {
        tellPlayer("Whatever was going to stay with you doesn't.");
      }
      return true;
    }
    const all = CARRY_ALL.some((p) => p.test(text));
    if (!all && !CARRY_LAST.some((p) => p.test(text))) return false;
    if (!isSessionActiveWith(sender) || !mentionsAnyName(content, playerOwnNames())) return false;
    const wanted = all ? appliedSuggestions() : lastApplied();
    const character = ChatRoomCharacter?.find((c) => c?.MemberNumber === sender);
    const result = carryThese(sender, character?.Name ?? `#${sender}`, wanted);
    if (result.refusal) tellHypnotist(sender, `[carry] Refused \u2014 ${result.refusal}`);
    if (result.subject) tellPlayer(result.subject);
    return true;
  }
  var WAKE_PATTERNS = [
    // Bare "wake" included: DW tried "Missy wake" and nothing happened. Guarded against
    // first-person the same way the other bare imperatives are.
    /(?<!\bi )(?<!\bwe )\bwake\b/,
    /\bwake up\b/,
    /\bwake now\b/,
    /\byou (?:are|will be) (?:wide )?awake\b/,
    /\byou (?:will |)wake (?:up )?(?:now|when|on)\b/,
    /\bawaken\b/,
    /\bcome back to me\b/,
    /\bcome out of (?:it|trance|the trance)\b/
  ];
  function isWakeLine(content) {
    const text = normalize(content);
    if (!text || isSelfReferential(text)) return false;
    return WAKE_PATTERNS.some((p) => p.test(text));
  }
  var WALK_ENTER_PATTERNS = [
    /\bwalk with me\b/,
    /\bcome (?:and )?walk with me\b/,
    /\b(?:stay|come) with me as you (?:move|walk)\b/,
    /\byou (?:can|may) (?:move|walk) (?:with me |)(?:but |and |)stay under\b/,
    /\byou (?:can|may) walk(?: with me)?\b/,
    /\bmove with me\b/,
    /\bon your feet\b/
  ];
  var WALK_LEAVE_PATTERNS = [
    /\bbe still\b/,
    /\bbe frozen\b/,
    /\bstop\b/,
    /\b(?:stand|hold|stay) still\b/,
    /\bstay put\b/,
    /\bstillness\b/,
    /\bfreeze again\b/,
    /\bstay\b/
  ];
  function handleWalkingTrance(sender, content) {
    const text = normalize(content);
    if (!text || isSelfReferential(text)) return false;
    const wantsEnter = WALK_ENTER_PATTERNS.some((p) => p.test(text));
    const wantsLeave = isWalkingTrance() && WALK_LEAVE_PATTERNS.some((p) => p.test(text));
    if (!wantsEnter && !wantsLeave) return false;
    if (!hasLiveSessionWith(sender)) {
      log(`heard a walking-trance line from ${sender} but they have no session with you`);
      return true;
    }
    if (!mentionsAnyName(content, playerOwnNames())) {
      log(`heard a walking-trance line from ${sender} but they didn't say your name \u2014 ignoring`);
      return true;
    }
    if (wantsEnter && !isWalkingTrance()) {
      if (!enterWalkingTrance()) log(`walking-trance enter from ${sender} ignored \u2014 not under`);
      return true;
    }
    leaveWalkingTrance();
    return true;
  }
  function handleWakeLine(sender, content) {
    if (!isWakeLine(content)) return false;
    if (!hasLiveSessionWith(sender)) {
      log(`heard a wake keyword from ${sender} but they have no session with you`);
      return true;
    }
    if (!mentionsAnyName(content, playerOwnNames())) {
      log(`heard a wake keyword from ${sender} but they didn't say your name \u2014 ignoring`);
      return true;
    }
    wakeByHypnotist(sender);
    return true;
  }
  function handleBodyPartLine(sender, content) {
    const cmd = matchBodyPartCommand(content);
    if (!cmd) return false;
    const label = cmd.all ? "self-touch" : `touch:${cmd.word}`;
    if (!isSessionActiveWith(sender)) {
      log(`heard "${label}" from ${sender} but no active session with them \u2014 ignoring`);
      return true;
    }
    if (!mentionsAnyName(content, playerOwnNames())) {
      log(`heard "${label}" from ${sender} but they didn't say your name \u2014 ignoring`);
      return true;
    }
    const features = getFeatures();
    if (!features.hypnoEnabled || !features.selfTouchControl) {
      log(`heard "${label}" from ${sender} but selfTouchControl isn't granted`);
      return true;
    }
    const recorded = recordAction(cmd.all ? "touch:all" : `touch:${cmd.word}`);
    if (recorded) {
      tellPlayer(recorded);
      return true;
    }
    if (cmd.all) setAllSelfTouchBlocked(cmd.block);
    else setBodyPartBlocked(cmd.word, cmd.groups, cmd.block);
    const actionId = cmd.all ? "touch:all" : `touch:${cmd.word}`;
    if (cmd.block) {
      noteApplied(actionId);
    } else {
      noteReleased(actionId);
      dropCarried(actionId);
    }
    log(`${cmd.block ? "blocked" : "released"} ${label}`);
    if (!cmd.block) announce("selftouch-part-release");
    else if (cmd.all) announce("selftouch-applied");
    else announceBodyPartApplied(cmd.word);
    return true;
  }
  var ACTIVITY_VERBS = [
    { activity: "Grope", re: /\b(?:grope|squeeze|fondle)\b/ },
    { activity: "Pinch", re: /\bpinch\b/ },
    { activity: "Spank", re: /\b(?:spank|smack)\b/ },
    { activity: "Slap", re: /\bslap\b/ },
    { activity: "Scratch", re: /\bscratch\b/ },
    { activity: "Tickle", re: /\btickle\b/ },
    { activity: "Pull", re: /\b(?:pull|tug)\b/ },
    { activity: "Choke", re: /\bchoke\b/ },
    { activity: "MassageHands", re: /\b(?:massage|knead)\b/ },
    { activity: "Nibble", re: /\bnibble\b/ },
    { activity: "Lick", re: /\blick\b/ },
    { activity: "Kiss", re: /\bkiss\b/ },
    { activity: "Suck", re: /\bsuck\b/ },
    { activity: "Bite", re: /\bbite\b/ },
    { activity: "Pet", re: /\bpet\b/ },
    { activity: "MasturbateHand", re: /\b(?:finger|masturbate|pleasure|play with)\b/ },
    // The universal — Caress reaches almost every zone, so "touch your <anything>" lands.
    { activity: "Caress", re: /\b(?:caress|stroke|touch|feel|rub)\b/ }
  ];
  var COMMAND_NEGATION = /\b(?:not|never|cannot|can ?not|dont|do ?not|wont|will ?not|no longer|stop)\b/;
  var GENITAL_SELF = /\b(?:finger|masturbate|pleasure|play with) yourself\b/;
  var VAGUE_SELF = /\b(?:touch|feel|caress|stroke|rub|please) yourself\b/;
  function matchActivityCommand(content) {
    const text = normalize(content);
    if (!text || isSelfReferential(text) || COMMAND_NEGATION.test(text)) return null;
    if (GENITAL_SELF.test(text)) return { kind: "genital" };
    if (VAGUE_SELF.test(text)) return { kind: "vague" };
    const words = Object.keys(BODY_PARTS).sort((a, b) => b.length - a.length);
    for (const v of ACTIVITY_VERBS) {
      if (!v.re.test(text)) continue;
      for (const word of words) {
        if (new RegExp(`\\byour ${word}\\b`).test(text)) return { kind: "part", activity: v.activity, word };
      }
    }
    return null;
  }
  function activityActionId(cmd) {
    if (cmd.kind === "vague") return "act:vague";
    if (cmd.kind === "genital") return "act:genital";
    return `act:${cmd.activity}:${cmd.word}`;
  }
  var VAGUE_ZONES = [
    "ItemBreast",
    "ItemButt",
    "ItemArms",
    "ItemLegs",
    "ItemTorso",
    "ItemNeck",
    "ItemHead",
    "ItemPelvis",
    "ItemHands",
    "ItemFeet",
    "ItemNipples"
  ];
  function pickVagueZone() {
    const reachable = VAGUE_ZONES.filter((g) => {
      try {
        return (ActivityAllowedForGroup(Player, g) || []).some((a) => a?.Activity?.Name === "Caress");
      } catch {
        return false;
      }
    });
    return reachable.length ? reachable[Math.floor(Math.random() * reachable.length)] : null;
  }
  function runCommandedActivity(activityName, groupNames, target = Player) {
    const family = target?.AssetFamily ?? Player?.AssetFamily ?? "Female3DCG";
    for (const groupName of groupNames) {
      let allowed = [];
      try {
        allowed = ActivityAllowedForGroup(target, groupName) || [];
      } catch {
        allowed = [];
      }
      const itemActivity = allowed.find((a) => a?.Activity?.Name === activityName);
      if (!itemActivity) continue;
      const groupObj = typeof AssetGroupGet === "function" ? AssetGroupGet(family, groupName) : null;
      if (!groupObj) continue;
      try {
        beginCommandedActivity();
        ActivityRun(Player, target, groupObj, itemActivity);
      } finally {
        endCommandedActivity();
      }
      return groupName;
    }
    return null;
  }
  function performActivityAction(id) {
    if (id === "act:vague") {
      const zone = pickVagueZone();
      return zone ? runCommandedActivity("Caress", [zone]) != null : false;
    }
    if (id === "act:genital") return runCommandedActivity("MasturbateHand", ["ItemVulva"]) != null;
    const [, activity, word] = id.split(":");
    const groups = word ? BODY_PARTS[word] ?? [] : [];
    return activity && groups.length ? runCommandedActivity(activity, groups) != null : false;
  }
  function handleActivityCommand(sender, content) {
    const cmd = matchActivityCommand(content);
    if (!cmd) return false;
    if (!isSessionActiveWith(sender)) {
      log(`heard an activity command from ${sender} but no active session with them`);
      return true;
    }
    if (!mentionsAnyName(content, playerOwnNames())) {
      log(`heard an activity command from ${sender} but they didn't say your name \u2014 ignoring`);
      return true;
    }
    const f = getFeatures();
    if (!f.hypnoEnabled || !f.compelActivity) {
      tellHypnotist(sender, '[command] Refused \u2014 they have not enabled "Made to act".');
      return true;
    }
    const recorded = recordAction(activityActionId(cmd));
    if (recorded) {
      tellPlayer(recorded);
      return true;
    }
    const refusal = depthRefusal("compelActivity");
    if (refusal) {
      tellHypnotist(sender, `[command] Refused \u2014 ${refusal}.`);
      return true;
    }
    if (Player?.HasEffect?.("Freeze") && !hasOwnEffect("Freeze")) {
      tellHypnotist(sender, "[command] Refused \u2014 a restraint has them frozen; they cannot move to.");
      return true;
    }
    if (cmd.kind === "vague") return runVagueTouch(sender);
    const activity = cmd.kind === "genital" ? "MasturbateHand" : cmd.activity;
    const groups = cmd.kind === "genital" ? ["ItemVulva"] : BODY_PARTS[cmd.word] ?? [];
    const landed = runCommandedActivity(activity, groups);
    if (!landed) {
      tellHypnotist(sender, `[command] "${activity.toLowerCase()}" won't land there right now \u2014 bound, out of reach, or not somewhere it works.`);
      return true;
    }
    tellPlayer("Your body does it without waiting for you to decide.");
    return true;
  }
  function runVagueTouch(sender) {
    const pick2 = pickVagueZone();
    if (!pick2) {
      tellHypnotist(sender, "[command] Too vague \u2014 and nothing is within reach right now anyway.");
      return true;
    }
    const landed = runCommandedActivity("Caress", [pick2]);
    tellHypnotist(sender, "[command] Too vague \u2014 her hands wander on their own. Name a part to steer them.");
    if (landed) tellPlayer("Your hands move on their own, with no place in mind.");
    return true;
  }
  var DEFAULT_PART = { Kiss: "lips", Spank: "bottom", Pet: "head" };
  function matchTargetedActivityCommand(content, roster) {
    const text = normalize(content);
    if (!text || isSelfReferential(text) || COMMAND_NEGATION.test(text)) return null;
    const names = [...new Set(roster.map((n) => normalize(String(n ?? ""))).filter((n) => n && n !== "me" && n !== "my"))].sort((a, b) => b.length - a.length);
    const part = `(${Object.keys(BODY_PARTS).sort((a, b) => b.length - a.length).join("|")})`;
    const hit = (rest, lead) => {
      const m = new RegExp(`^${lead}(?: s)? ${part}\\b`).exec(rest) ?? new RegExp(`^${lead} on (?:the|her|his|their|my) ${part}\\b`).exec(rest);
      if (m) return { word: m[1] };
      const other = new RegExp(`^${lead}(?: s| on (?:the|her|his|their|my)) ([a-z]+)`).exec(rest);
      if (other) return { word: null, unknownPart: other[1] };
      return new RegExp(`^${lead}\\b`).test(rest) ? { word: null } : null;
    };
    for (const v of ACTIVITY_VERBS) {
      for (const m of text.matchAll(new RegExp(`${v.re.source} (.+)$`, "g"))) {
        const rest = m[m.length - 1];
        if (/^feel\b/.test(m[0])) continue;
        const mine = new RegExp(`^my ${part}\\b`).exec(rest);
        if (mine) return { activity: v.activity, target: "me", word: mine[1] };
        const me = hit(rest, "me");
        if (me) return { activity: v.activity, target: "me", ...me };
        for (const n of names) {
          const got = hit(rest, n);
          if (got) return { activity: v.activity, target: n, ...got };
        }
      }
    }
    return null;
  }
  function roomOthers() {
    const roster = Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter : [];
    return roster.filter((c) => c?.MemberNumber && c.MemberNumber !== Player?.MemberNumber);
  }
  var namesOf = (c) => [c?.Name, c?.Nickname].filter((n) => typeof n === "string" && n.trim());
  function itemPermissionBlocks(target) {
    try {
      if (typeof ServerChatRoomGetAllowItem === "function") return ServerChatRoomGetAllowItem(Player, target) === false;
    } catch {
    }
    return target?.AllowItem === false;
  }
  function ownRefusalReason(hyp, word, groups) {
    if (itemPermissionBlocks(hyp))
      return "your BC item permissions don't let them use items on you. Whitelist them, or lower your item permission";
    if (hyp?.ArousalSettings?.Active === "Inactive")
      return "your BC arousal preference is set to Inactive, which turns activities on you off";
    if (typeof PreferenceGetArousalZone === "function") {
      try {
        const closed = groups.every((g) => (PreferenceGetArousalZone(hyp, g)?.Factor ?? 1) <= 0);
        if (closed) return `your BC arousal zones have your ${word} set to no`;
      } catch {
      }
    }
    return "something blocks it in BC \u2014 your arousal settings for that activity or zone, or they cannot reach (gagged, hands bound, too far away)";
  }
  function handleTargetedActivityCommand(sender, content) {
    const roster = roomOthers();
    const cmd = matchTargetedActivityCommand(content, roster.flatMap(namesOf));
    if (!cmd) return false;
    if (!isSessionActiveWith(sender)) {
      log(`heard a targeted activity command from ${sender} but no active session with them`);
      return true;
    }
    if (!mentionsAnyName(content, playerOwnNames())) {
      log(`heard a targeted activity command from ${sender} but they didn't say your name \u2014 ignoring`);
      return true;
    }
    const f = getFeatures();
    if (!f.hypnoEnabled || !f.compelActivity) {
      tellHypnotist(sender, '[command] Refused \u2014 they have not enabled "Made to act".');
      return true;
    }
    let target;
    if (cmd.target === "me") {
      target = roster.find((c) => c.MemberNumber === sender);
    } else {
      const hits = roster.filter((c) => namesOf(c).some((n) => normalize(n) === cmd.target));
      if (hits.length > 1) {
        tellHypnotist(sender, `[command] Refused \u2014 more than one person here answers to "${cmd.target}". I won't guess which.`);
        return true;
      }
      target = hits[0];
    }
    if (!target) {
      tellHypnotist(sender, "[command] Refused \u2014 I can't find who that's aimed at in the room.");
      return true;
    }
    const onHypnotist = target.MemberNumber === sender;
    const verb = cmd.activity === "MasturbateHand" ? "finger" : cmd.activity.toLowerCase();
    if (!onHypnotist && !f.compelTouchOthers) {
      tellHypnotist(sender, '[command] Refused \u2014 they have not enabled "Made to touch others".');
      return true;
    }
    if (isRecording()) {
      tellHypnotist(sender, "[command] Not recorded \u2014 a trigger can't aim at a person yet, only at themselves.");
      return true;
    }
    const refusal = depthRefusal("compelActivity");
    if (refusal) {
      tellHypnotist(sender, `[command] Refused \u2014 ${refusal}.`);
      return true;
    }
    if (Player?.HasEffect?.("Freeze") && !hasOwnEffect("Freeze")) {
      tellHypnotist(sender, "[command] Refused \u2014 a restraint has them frozen; they cannot move to.");
      return true;
    }
    if (cmd.unknownPart) {
      tellHypnotist(sender, `[command] I don't know "${cmd.unknownPart}" as a body part, so nothing happened.`);
      return true;
    }
    const word = cmd.word ?? DEFAULT_PART[cmd.activity] ?? null;
    if (!word) {
      const who = onHypnotist ? "my" : `${cmd.target}'s`;
      tellHypnotist(sender, `[command] Name a part \u2014 "${verb}" has no obvious spot. For example: "${verb} ${who} arms".`);
      return true;
    }
    const groups = BODY_PARTS[word] ?? [];
    const landed = itemPermissionBlocks(target) ? null : runCommandedActivity(cmd.activity, groups, target);
    if (!landed) {
      if (onHypnotist) tellHypnotist(sender, `[command] "${verb}" didn't land on you \u2014 ${ownRefusalReason(target, word, groups)}.`);
      else tellHypnotist(sender, `[command] "${verb}" didn't land.`);
      return true;
    }
    log(`commanded ${cmd.activity} on ${target.MemberNumber}'s ${landed}`);
    tellPlayer("Your body moves to them without waiting for you to decide.");
    return true;
  }
  function handleSpokenLine(sender, content) {
    const scope = scopeToAddressee(content, playerOwnNames(), otherRoomNames(sender));
    const line = scope.text;
    if (line !== null) {
      if (handleTriggerControl(sender, line)) return;
      if (handleCarryControl(sender, line)) return;
      if (handleTriggerRelease(sender, line)) return;
      if (handleReinforcement(sender, line)) return;
    }
    if (handleTriggerFiring(sender, content)) return;
    if (line === null) {
      if (scope.ambiguous) {
        if (isSessionActiveWith(sender))
          tellHypnotist(
            sender,
            "[command] That line named more than one person and it was not clear which part was meant for me. Give each subject their own line."
          );
        log(`ambiguous multi-subject line from ${sender} \u2014 refusing rather than guessing which part is ours`);
      }
      return;
    }
    if (handleWakeLine(sender, line)) return;
    if (handleWalkingTrance(sender, line)) return;
    if (handleBodyPartLine(sender, line)) return;
    if (handleTargetedActivityCommand(sender, line)) return;
    if (handleActivityCommand(sender, line)) return;
    const id = matchSuggestion(line);
    if (!id) return;
    const suggestion = SUGGESTIONS.find((s) => s.id === id);
    if (!suggestion) return;
    const carriedRelease = !!suggestion.release && !!suggestion.releaseOf && isCarrierOf(sender) && releasesOf(suggestion).some(isCarried);
    if (!isSessionActiveWith(sender) && !carriedRelease) {
      log(`heard "${id}" from ${sender} but no active session with them \u2014 ignoring`);
      return;
    }
    if (!mentionsAnyName(line, playerOwnNames())) {
      log(`heard "${id}" from ${sender} but they didn't say your name \u2014 ignoring`);
      return;
    }
    const features = getFeatures();
    const blocked = blockedReason(suggestion, sender, features);
    if (blocked) {
      log(`heard "${id}" from ${sender} but ${blocked}`);
      tellHypnotist(sender, `[suggestion] Refused \u2014 "${suggestion.id}" ${blocked}.`);
      return;
    }
    const recorded = recordAction(id);
    if (recorded) {
      tellPlayer(recorded);
      return;
    }
    log(`matched suggestion "${id}" in: ${line}`);
    const outcome = suggestion.run() || id;
    if (outcome !== id) tellHypnotist(sender, `[suggestion] "${id}" matched but did not land: ${outcome}.`);
    if (Array.isArray(suggestion.permission) && !suggestion.release) {
      const { applied: applied2, skipped } = reachableCategories(suggestion.permission, features);
      if (skipped.length && applied2.length) {
        const word = (k) => CATEGORY_WORDS[k] ?? k;
        tellHypnotist(
          sender,
          `[suggestion] "${id}" took for ${applied2.map(word).join(", ")}; not ${skipped.map((s) => `${word(s.key)} (${s.why})`).join(", ")}.`
        );
      }
    }
    announce(outcome);
    if (suggestion.release) {
      for (const of of releasesOf(suggestion)) {
        noteReleased(of);
        dropCarried(of);
      }
    } else {
      noteApplied(id);
    }
  }

  // src/icon.ts
  var INK = "#2c2352";
  var TURNS = 3;
  var R_MAX = 44;
  var STROKE = 4.5;
  function spiralPath() {
    const n = 240;
    const tMax = TURNS * 2 * Math.PI;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = tMax * i / n;
      const r = R_MAX * (t / tMax);
      pts.push(`${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`);
    }
    return `M${pts.join(" L")}`;
  }
  function build() {
    try {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 100 100"><path d="${spiralPath()}" fill="none" stroke="${INK}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="50" r="${(STROKE * 0.7).toFixed(2)}" fill="${INK}"/></svg>`;
      return "data:image/svg+xml," + encodeURIComponent(svg);
    } catch {
      return void 0;
    }
  }
  var SPIRAL_ICON = build();

  // src/panel.ts
  var TITLE_Y = 110;
  var TAB_LEFT = 200;
  var TAB_WIDTH = 280;
  var TAB_HEIGHT = 72;
  var TAB_GAP = 8;
  var PANEL_LEFT = TAB_LEFT + TAB_WIDTH;
  var PANEL_TOP = 190;
  var PANEL_WIDTH = 1800 - PANEL_LEFT;
  var PANEL_HEIGHT = 902 - PANEL_TOP;
  var BORDER = 3;
  var MAX_TABS = Math.floor((PANEL_HEIGHT + TAB_GAP) / (TAB_HEIGHT + TAB_GAP));
  var BLURB_Y = 235;
  var CONTENT_LEFT = PANEL_LEFT + 60;
  var BACK_LEFT = 1815;
  var BACK_TOP = 75;
  var BACK_SIZE = 90;
  function tabTop(index) {
    return PANEL_TOP + index * (TAB_HEIGHT + TAB_GAP);
  }
  function tabHitIndex(count) {
    for (let i = 0; i < count; i++) {
      if (MouseIn(TAB_LEFT, tabTop(i), TAB_WIDTH, TAB_HEIGHT)) return i;
    }
    return null;
  }
  function drawLeftText(text, x, y, color = "Black") {
    MainCanvas.save();
    MainCanvas.textAlign = "left";
    DrawText(text, x, y, color, "Gray");
    MainCanvas.restore();
  }
  function drawLeftTextFit(text, x, y, maxWidth, color = "Black") {
    MainCanvas.save();
    MainCanvas.textAlign = "left";
    let size = 36;
    const font = (n) => typeof CommonGetFont === "function" ? CommonGetFont(n) : `${n}px arial`;
    MainCanvas.font = font(size);
    while (size > 22 && MainCanvas.measureText(text).width > maxWidth) {
      size -= 2;
      MainCanvas.font = font(size);
    }
    let out = text;
    if (MainCanvas.measureText(out).width > maxWidth) {
      while (out.length > 1 && MainCanvas.measureText(`${out}\u2026`).width > maxWidth) out = out.slice(0, -1);
      out = `${out}\u2026`;
    }
    MainCanvas.textBaseline = "middle";
    MainCanvas.fillStyle = color;
    MainCanvas.fillText(out, x, y);
    MainCanvas.restore();
  }
  function drawLeftTextWrap(text, x, yCentre, maxWidth, maxHeight, color = "Black", maxSize = 32, minSize = 18) {
    MainCanvas.save();
    const font = (n) => typeof CommonGetFont === "function" ? CommonGetFont(n) : `${n}px arial`;
    const pitch = (n) => Math.round(n * 1.2);
    let size = maxSize;
    let lines = [];
    for (; ; size -= 2) {
      MainCanvas.font = font(size);
      lines = wrapToWidth(text, maxWidth);
      if (lines.length * pitch(size) <= maxHeight || size - 2 < minSize) break;
    }
    const room = Math.max(1, Math.floor(maxHeight / pitch(size)));
    if (lines.length > room) {
      lines = lines.slice(0, room);
      let last = lines[room - 1];
      while (last.length > 1 && MainCanvas.measureText(`${last}\u2026`).width > maxWidth) last = last.slice(0, -1);
      lines[room - 1] = `${last}\u2026`;
    }
    MainCanvas.textAlign = "left";
    MainCanvas.textBaseline = "middle";
    MainCanvas.fillStyle = color;
    const first = yCentre - (lines.length - 1) * pitch(size) / 2;
    lines.forEach((line, i) => MainCanvas.fillText(line, x, first + i * pitch(size)));
    MainCanvas.restore();
    return { size, lines };
  }
  function wrapToWidth(text, maxWidth) {
    const out = [];
    let line = "";
    for (const w of text.split(/\s+/).filter(Boolean)) {
      const trial = line ? `${line} ${w}` : w;
      if (!line || MainCanvas.measureText(trial).width <= maxWidth) line = trial;
      else {
        out.push(line);
        line = w;
      }
    }
    if (line) out.push(line);
    return out.length ? out : [""];
  }
  function drawSmallText(text, x, y, size, color = "Black") {
    MainCanvas.save();
    MainCanvas.textAlign = "left";
    MainCanvas.textBaseline = "middle";
    MainCanvas.font = typeof CommonGetFont === "function" ? CommonGetFont(size) : `${size}px arial`;
    MainCanvas.fillStyle = color;
    MainCanvas.fillText(text, x, y);
    MainCanvas.restore();
  }
  function drawTabsAndPanel(names, activeIndex) {
    const activeTop = tabTop(activeIndex);
    const activeBottom = activeTop + TAB_HEIGHT;
    const panelRight = PANEL_LEFT + PANEL_WIDTH;
    const panelBottom = PANEL_TOP + PANEL_HEIGHT;
    DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "White");
    names.forEach((name, i) => {
      if (i !== activeIndex) DrawButton(TAB_LEFT, tabTop(i), TAB_WIDTH + BORDER, TAB_HEIGHT, name, "#d8d8d8");
    });
    DrawRect(TAB_LEFT, activeTop, TAB_WIDTH + BORDER, TAB_HEIGHT, "White");
    DrawRect(TAB_LEFT, activeTop, BORDER, TAB_HEIGHT, "Black");
    DrawRect(TAB_LEFT, activeTop, TAB_WIDTH, BORDER, "Black");
    DrawRect(TAB_LEFT, activeBottom - BORDER, TAB_WIDTH, BORDER, "Black");
    DrawTextFit(names[activeIndex], TAB_LEFT + TAB_WIDTH / 2, activeTop + TAB_HEIGHT / 2 + 1, TAB_WIDTH - 32, "black");
    DrawRect(PANEL_LEFT, PANEL_TOP, BORDER, Math.max(0, activeTop - PANEL_TOP), "Black");
    DrawRect(PANEL_LEFT, activeBottom, BORDER, Math.max(0, panelBottom - activeBottom), "Black");
    DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, BORDER, "Black");
    DrawRect(panelRight - BORDER, PANEL_TOP, BORDER, PANEL_HEIGHT, "Black");
    DrawRect(PANEL_LEFT, panelBottom - BORDER, PANEL_WIDTH, BORDER, "Black");
  }
  var HELP_LEFT = CONTENT_LEFT;
  var HELP_WIDTH = PANEL_LEFT + PANEL_WIDTH - CONTENT_LEFT - 40;
  var HELP_TOP = 282;
  var HELP_BOTTOM = PANEL_TOP + PANEL_HEIGHT - 96;
  var BODY_SIZE = 24;
  var HEAD_SIZE = 26;
  var HEAD_LEAD = 18;
  var GAP_SIZE = 14;
  function styleOf(style) {
    if (style === "head") return { size: HEAD_SIZE, color: "Black" };
    if (style === "dim") return { size: BODY_SIZE, color: "#777" };
    return { size: BODY_SIZE, color: "#222" };
  }
  function helpFont(size) {
    return typeof CommonGetFont === "function" ? CommonGetFont(size) : `${size}px arial`;
  }
  function lineBand(size) {
    return Math.round(size * 1.34);
  }
  function wrapText(text, size) {
    MainCanvas.save();
    MainCanvas.font = helpFont(size);
    const words = text.split(/\s+/).filter(Boolean);
    const out = [];
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (!line || MainCanvas.measureText(trial).width <= HELP_WIDTH) line = trial;
      else {
        out.push(line);
        line = w;
      }
    }
    if (line) out.push(line);
    MainCanvas.restore();
    return out.length ? out : [""];
  }
  function paginateHelp(lines) {
    const pages = [[]];
    let y = HELP_TOP;
    const newPage = () => {
      pages.push([]);
      y = HELP_TOP;
    };
    for (const line of lines) {
      const cur = () => pages[pages.length - 1];
      if (line.style === "gap") {
        if (cur().length) y += GAP_SIZE;
        continue;
      }
      const { size, color } = styleOf(line.style);
      const lead = line.style === "head" ? HEAD_LEAD : 0;
      const segments = wrapText(line.text, size);
      segments.forEach((seg, i) => {
        const band = lineBand(size);
        const gapBefore = i === 0 && cur().length ? lead : 0;
        if (y + gapBefore + band > HELP_BOTTOM && cur().length) newPage();
        const top = y + (cur().length ? gapBefore : 0);
        cur().push({ text: seg, size, color, y: top + band / 2 });
        y = top + band;
      });
    }
    return pages;
  }
  function drawHelpLines(lines, page2) {
    const pages = paginateHelp(lines);
    const p = Math.min(Math.max(0, page2), pages.length - 1);
    for (const row of pages[p]) {
      if (row.text) drawSmallText(row.text, HELP_LEFT, row.y, row.size, row.color);
    }
    return pages.length;
  }

  // src/help.ts
  var open = false;
  var activeTab = 0;
  var page = 0;
  function isHelpOpen() {
    return open;
  }
  function openHelp() {
    open = true;
    activeTab = 0;
    page = 0;
  }
  function closeHelp() {
    open = false;
  }
  var head = (text) => ({ text, style: "head" });
  var body = (text) => ({ text });
  var dim = (text) => ({ text, style: "dim" });
  var gap = () => ({ text: "", style: "gap" });
  function startedLines() {
    return [
      head("The short version"),
      body("Almost nothing here is a command. You SPEAK to someone, and their"),
      body("own client decides whether anything lands. Nobody is ever made to"),
      body("do anything \u2014 their settings answer for them."),
      gap(),
      head("As the subject"),
      body("1. Tick the permissions you want to allow. Everything is off until"),
      body("   you say so \u2014 a fresh install does nothing on purpose."),
      body("2. Someone attempts hypnosis; you privately choose Agree, Ignore or"),
      body("   Fight. They are never told which."),
      body("3. If it lands, they can suggest things simply by talking to you."),
      body("4. /hypno safeword ends everything, from any state, always."),
      gap(),
      head("As the hypnotist"),
      body("1. Open their profile, click the H icon, Attempt Hypnosis."),
      dim("   The icon shows on everyone \u2014 it cannot know who has the add-on"),
      dim("   until it asks. The panel says within 3 seconds whether they do."),
      body("2. Wait out the induction window \u2014 that time is for roleplay, and"),
      body("   roleplaying it well improves the roll."),
      body("3. Then just talk. Use their NAME, or nothing lands."),
      gap(),
      head("Why nothing happened"),
      body("Every suggestion is gated, and the checks run in this order:"),
      body("  1. their permission for that feature is on"),
      body("  2. a live trance with YOU specifically"),
      body("  3. their name is somewhere in the line"),
      body("  4. they are deep enough \u2014 the deeper the effect, the deeper the"),
      body("     trance it needs (see Depth & Trust)"),
      dim("/hypno match <phrase> reports whether the words matched; a refused"),
      dim("suggestion tells the hypnotist which gate stopped it."),
      gap(),
      head("Who sees what"),
      body("[Text in square brackets] reached only you \u2014 nobody else saw it and"),
      body("nothing in the room reacted. Anything the room could really have"),
      body("seen is emoted instead, so everyone present reads it: reaching for"),
      body("yourself and stopping, going still, opening your mouth and failing."),
      dim("Perception effects are never emoted \u2014 nobody can watch you fail to"),
      dim("notice something. Trance Defaults > Others See Your Reactions turns"),
      dim("the emotes off entirely."),
      gap(),
      head("Getting out"),
      body("The Wake Up button \xB7 a spoken wake word \xB7 /hypno wake while the"),
      body("trance is still shallow \xB7 a 30-minute timeout \xB7 and /hypno safeword,"),
      body("which no setting and no suggestion can ever take away.")
    ];
  }
  function vocabularyLines() {
    const lines = [
      body("Generated from the pattern library, so it can never fall behind the"),
      body("code. Say any of these WITH the subject's name. Releases are dim."),
      dim("Each gate shows the permission it needs and, where it matters, the"),
      dim("least depth \u2014 so a line can match perfectly and still wait for a"),
      dim("deeper trance. Contractions and punctuation are ignored."),
      gap()
    ];
    for (const sug of suggestionHelp()) {
      const gateBits = [];
      if (!sug.release) gateBits.push(sug.permission);
      if (sug.depthTier) gateBits.push(`${sug.depthTier}+`);
      const gate = gateBits.length ? `   (${gateBits.join(", ")})` : "";
      lines.push({
        text: `${sug.display.map((e) => `"${e}"`).join("  \xB7  ")}${gate}`,
        style: sug.release ? "dim" : "body"
      });
    }
    lines.push(gap());
    lines.push(head("Not in the table"));
    lines.push(body(`"wake up" \xB7 "you are awake" \xB7 "come back to me" \u2014 ending a trance,`));
    lines.push(dim("   always allowed, gated by no permission."));
    lines.push(body(`"walk with me" \xB7 "be still" \u2014 walking trance: still under, but on`));
    lines.push(dim(`   your feet with the veil lifted; "be still" puts the stillness back.`));
    lines.push(body(`"you cannot touch your breasts" \xB7 "...touch yourself"`));
    lines.push(dim("   (selfTouchControl) \u2014 around 40 body words are understood."));
    lines.push(body(`"touch your breasts" \xB7 "pinch your nipples" \xB7 "lick your thighs"`));
    lines.push(dim("   (Made to Act) \u2014 one grammar: <verb> your <part>. touch \xB7 caress \xB7 rub \xB7"));
    lines.push(dim("   pinch \xB7 spank \xB7 slap \xB7 scratch \xB7 tickle \xB7 pull \xB7 lick \xB7 kiss \xB7 bite \xB7"));
    lines.push(dim('   massage \xB7 pet. Bare "touch yourself" wanders; name a part to steer it.'));
    lines.push(body(`"kiss Rei" \xB7 "kiss Rei's nipples" \xB7 "kiss me" \xB7 "pinch my nipples"`));
    lines.push(dim("   (Made to Act, + Made to Touch Others for anyone but you) \u2014 the same verbs"));
    lines.push(dim("   aimed at someone. Exact name or nickname. Kiss, spank, pet need no part."));
    return lines;
  }
  function depthLadder() {
    const lines = [head("The five depths")];
    for (const t of DEPTH_TIERS) lines.push(body(`${t.label} (${t.min}+) \u2014 ${t.blurb}`));
    lines.push(gap());
    lines.push(head("What each depth reaches"));
    let anyEarned = false;
    for (const t of DEPTH_TIERS) {
      const here = DEPTH_GATES.filter((g) => g.tier === t.key);
      if (!here.length) continue;
      const names = here.map((g) => {
        if (g.earnedOnly) anyEarned = true;
        return g.earnedOnly ? `${g.label}*` : g.label;
      }).join(" \xB7 ");
      lines.push(body(`${t.label}: ${names}`));
    }
    if (anyEarned) {
      lines.push(dim("* earned depth only \u2014 arousal cannot reach these by default (below)."));
    }
    lines.push(dim("Deeper is a consent setting, not a difficulty: the Depth tab moves"));
    lines.push(dim("any of these up or down for yourself."));
    return lines;
  }
  function depthTrustLines() {
    return [
      head("Two questions, kept separate"),
      body("A permission asks may they EVER do this to me. Depth asks how far"),
      body("UNDER I have to be before it can. Both must be satisfied, always."),
      gap(),
      ...depthLadder(),
      gap(),
      head("Trust sets how deep they can take you"),
      body("Trust is per-person and lives on YOUR client, counted from your"),
      body("interactions. A message in ordinary talk builds a little \u2014 at most"),
      body("one every 5 minutes, double when they use your name \u2014 and a"),
      body("successful induction is worth five of those."),
      dim("Minutes to be reachable, an evening to be usable, a long time to be"),
      dim("deeply trusted. The value is derived from the count, so retuning the"),
      dim("curve never corrupts what you built."),
      gap(),
      head("Arousal is a floor, not a multiplier"),
      body("Access is the higher of your trust and your arousal, and arousal is"),
      body("capped at 30. So being worked up lets a stranger reach shallow,"),
      body("session-only things \u2014 and nothing deeper, ever."),
      gap(),
      head("The earned-only three"),
      body("The clothing illusion, planting triggers, and carrying a suggestion"),
      body("past waking need EARNED depth \u2014 trust, not arousal \u2014 because they"),
      body("outlive the session or lie to you about your own body."),
      dim("The Depth tab can open the illusion and triggers to arousal for you,"),
      dim("at the price of fading fast. Carry-forward stays earned only."),
      gap(),
      head("Relationships give a floor"),
      body("Friend 15 \xB7 Lover 30 \xB7 Owner 65, under whatever you have earned, so"),
      body("a relationship is never re-earned. A friend gets in the door; a"),
      body("lover also reaches arousal; an owner reaches everything."),
      dim("Read from BC's own friend list, lovership and ownership."),
      gap(),
      head("Trust fades without contact"),
      body("In the Advanced view (button under the tabs): Never \xB7 Very slowly \xB7"),
      body("Slowly \xB7 Typical \xB7 Fast \xB7 Very fast. Off unless you choose."),
      dim("A casual acquaintance fades far faster than a deep bond, and a"),
      dim("relationship floor is what decay can never take."),
      gap(),
      head("The roll, when they attempt"),
      body("Chance = access + your choice (Agree +25 / Fight -25) + experience"),
      body("+ their honoured skill, clamped to 5-95 \u2014 never certain either way."),
      body(`You get ${getMaxAttempts()} tries at a time, then a ten-minute wait. That count is`),
      body("your setting, on the Permissions tab."),
      dim("/hypno chance <name> shows the real numbers for each choice."),
      gap(),
      head("Their skill, and whether you believe it"),
      body("Practised hypnotists are better at it. Their client tells yours how"),
      body("practised; YOUR Depth-tab setting decides how much to believe \u2014"),
      body("ignore it, believe it only from people you trust, cap it for everyone,"),
      body("or the default: full weight once you know someone, capped before that."),
      body("You feel it as a read on their manner at the prompt, never a number,"),
      body("and it can never reach the earned-only three.")
    ];
  }
  function lastingLines() {
    const minutes = getTriggerDuration();
    const scope = getTriggerScope();
    const scopeLabel = TRIGGER_SCOPES.find((sc) => sc.key === scope)?.label ?? scope;
    return [
      head("Two ways to outlast a session"),
      body("A TRIGGER sleeps until someone says its word. A CARRIED suggestion"),
      body("is simply still true when you wake."),
      dim("Both need a Deep trance, on earned depth \u2014 see Depth & Trust. Firing"),
      dim("your OWN trigger is off unless you tick it on the Triggers tab."),
      gap(),
      head("Planting a trigger \u2014 while they are under"),
      body(`"Missy, your trigger word is sleepy time"`),
      body(`"Missy, you cannot move"      (and any others)`),
      body(`"Missy, remember trigger"`),
      dim("The subject never sees the phrase. With Awareness > Trigger setup"),
      dim("on, they see none of the exchange at all."),
      gap(),
      head("Firing and releasing one"),
      body(`Say the phrase \u2014 it works with no session, which is the point.`),
      body(`"Missy, you are released from sleepy time" releases that one by name.`),
      dim("General release wording does nothing outside a trance."),
      gap(),
      head("Triggers fade unless kept up"),
      body("A planted trigger loses strength over time and eventually goes; the"),
      body("rate is on the Triggers tab (Never by default). A deep planting"),
      body("lasts longer than a shallow one, and neglect compounds."),
      body(`"Missy, that trigger holds" \u2014 said while under with the one who`),
      body("planted it \u2014 resets the clock. Firing it only slows the fade."),
      dim("A trigger opened to arousal (above) fades fast whatever the rate."),
      dim("/hypno triggers lists each one's strength and the tier it still reaches."),
      gap(),
      head("Carrying a suggestion past waking"),
      body(`"Missy, you cannot tell what you are wearing"`),
      body(`"Missy, that will stay with you"     \u2190 keeps that ONE`),
      body(`"Missy, all of this stays with you"  \u2190 keeps everything`),
      body(`"Missy, forget what I said"          \u2190 takes it back`),
      dim("Trance defaults can never be carried, so you always wake with your"),
      dim("movement and your voice back."),
      gap(),
      head("If something is holding you"),
      body("Wait for it to wear off \xB7 have whoever set it release you \xB7"),
      body("/hypno safeword, which always works from any state."),
      dim("/hypno forgettrigger REFUSES while a trigger has hold of you \u2014"),
      dim("deleting it would be too quiet an escape. Chat commands survive"),
      dim("being silenced, so the safeword stays reachable when speech does not."),
      gap(),
      head("Right now, on this character"),
      body(`A fired trigger lasts ${minutes > 0 ? `${minutes} min` : "until released"}, and triggers fire for: ${scopeLabel}.`),
      dim("Both are on the Triggers tab of the settings screen.")
    ];
  }
  function commandLines() {
    const ORDER = ["Session", "Diagnostics", "Data", "Testing"];
    const NOTE = {
      Session: "In a scene. Usable from any state; the safeword never fails.",
      Diagnostics: "Look without changing anything.",
      Data: "Your stored settings and stats.",
      Testing: "Development only \u2014 these vanish from a release build."
    };
    const cmds = commandHelp();
    const lines = [
      dim("Most features are SPOKEN, not typed \u2014 these are the exceptions."),
      gap()
    ];
    for (const group of ORDER) {
      if (group === "Testing" && !isTestingMode()) continue;
      const inGroup = cmds.filter((c) => c.group === group);
      if (!inGroup.length) continue;
      lines.push(head(group));
      if (NOTE[group]) lines.push(dim(NOTE[group]));
      for (const c of inGroup) {
        lines.push(body(`/hypno ${c.tag}${c.args ? ` ${c.args}` : ""} \u2014 ${c.description}`));
      }
      lines.push(gap());
    }
    return lines;
  }
  var TABS = [
    { name: "Start Here", blurb: "The loop, both sides of it, and every way out.", lines: startedLines },
    {
      name: "What to Say",
      blurb: "Everything you can say to a subject, generated from the patterns themselves.",
      lines: vocabularyLines
    },
    { name: "Depth & Trust", blurb: "How deep someone can take you, how that is earned, and what each depth reaches.", lines: depthTrustLines },
    { name: "Lasting", blurb: "Triggers and carried suggestions \u2014 the things that outlive a session.", lines: lastingLines },
    { name: "Commands", blurb: "The typed commands. The features themselves are spoken, not typed.", lines: commandLines }
  ];
  var PAGE_BUTTON_WIDTH = 120;
  var PAGE_BUTTON_HEIGHT = 52;
  var PAGE_BUTTON_TOP = PANEL_TOP + PANEL_HEIGHT - 72;
  var PAGE_PREV_LEFT = PANEL_LEFT + PANEL_WIDTH - 300;
  var PAGE_NEXT_LEFT = PANEL_LEFT + PANEL_WIDTH - 160;
  function drawHelp(title) {
    DrawText(title, MainCanvasWidth / 2, TITLE_Y, "Black");
    DrawButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Close help");
    drawTabsAndPanel(
      TABS.map((t) => t.name),
      activeTab
    );
    drawLeftText(TABS[activeTab].blurb, CONTENT_LEFT, BLURB_Y, "Gray");
    const pages = drawHelpLines(TABS[activeTab].lines(), page);
    if (pages > 1) {
      DrawButton(PAGE_PREV_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT, "Prev", "White", "", "", page === 0);
      DrawButton(
        PAGE_NEXT_LEFT,
        PAGE_BUTTON_TOP,
        PAGE_BUTTON_WIDTH,
        PAGE_BUTTON_HEIGHT,
        "Next",
        "White",
        "",
        "",
        page >= pages - 1
      );
      drawLeftText(`${page + 1} / ${pages}`, PAGE_PREV_LEFT - 90, PAGE_BUTTON_TOP + 26, "Gray");
    }
  }
  function clickHelp() {
    if (MouseIn(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE)) {
      closeHelp();
      return true;
    }
    const hit = tabHitIndex(TABS.length);
    if (hit !== null) {
      activeTab = hit;
      page = 0;
      return true;
    }
    if (MouseIn(PAGE_PREV_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
      page = Math.max(0, page - 1);
      return true;
    }
    if (MouseIn(PAGE_NEXT_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
      page += 1;
      return true;
    }
    return MouseIn(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT);
  }

  // src/wizard.ts
  var GROUP_FEATURES = {
    movement: ["movementRestriction", "speechRestriction", "postureControl", "clothingRestriction"],
    undress: ["undressControl", "selfTouchControl"],
    arousal: ["arousalControl"],
    compel: ["compelActivity"],
    perception: ["suppressClothing", "suppressBondage", "suppressActivities", "illusionControl"],
    lasting: ["triggerControl", "carryForward"]
  };
  var ALL_FEATURES = [
    "hypnoEnabled",
    ...Object.values(GROUP_FEATURES).flat(),
    "compelTouchOthers"
  ];
  function applySetup(cfg) {
    const on = new Set(cfg.features);
    if (on.size > 0) on.add("hypnoEnabled");
    for (const key of ALL_FEATURES) setFeature(key, on.has(key));
    if (cfg.access === "earned") {
      clearDepthOverrides();
    } else {
      const tier = cfg.access === "easy" ? "drifting" : "deep";
      for (const gate of DEPTH_GATES) setDepthOverride(gate.key, tier);
    }
    setChemicalScope(cfg.arousalShortcut ? "arousal" : "neither");
    setSkillHonour(cfg.honour);
    setTriggerDecayRate(cfg.triggersFade ? "typical" : "never");
    setChemicalReach("illusionControl", !!cfg.openChemical);
    setChemicalReach("triggerControl", !!cfg.openChemical);
    setStarterState("done");
  }
  var PRESETS = [
    {
      key: "hypnotist",
      name: "Hypnotist only",
      blurb: "You drive, you are not a subject. Nobody can hypnotize you; you can still hypnotize others.",
      config: { features: [], access: "earned", arousalShortcut: false, honour: "ignore", triggersFade: false }
    },
    {
      key: "light",
      name: "Light / safe",
      blurb: "The five session-only basics \u2014 hypnosis, movement, speech, posture, wardrobe \u2014 easy to reach.",
      config: {
        features: GROUP_FEATURES.movement,
        access: "earned",
        arousalShortcut: true,
        honour: "trusted",
        triggersFade: false
      }
    },
    {
      key: "balanced",
      name: "Balanced",
      blurb: "Most session things \u2014 adds undressing, touch, arousal and the awareness tricks \u2014 earned at a normal depth. Nothing that outlives the session.",
      config: {
        features: [
          ...GROUP_FEATURES.movement,
          ...GROUP_FEATURES.undress,
          ...GROUP_FEATURES.arousal,
          "suppressClothing",
          "suppressBondage",
          "suppressActivities"
        ],
        access: "earned",
        arousalShortcut: true,
        honour: "trusted",
        triggersFade: false
      }
    },
    {
      key: "extreme",
      name: "Extreme",
      blurb: "Everything on \u2014 triggers, carry-forward and the illusion included \u2014 at the easiest access, arousal allowed to reach them. Complete trust.",
      config: {
        features: [...Object.values(GROUP_FEATURES).flat(), "compelTouchOthers"],
        access: "easy",
        arousalShortcut: true,
        // The highest rung the settings cycle offers today. Rung 4 ("Skill can beat my
        // resistance") waits on dual fatigue; a later build can raise Extreme to it.
        honour: "capped",
        triggersFade: false,
        openChemical: true
      }
    }
  ];
  function applyPreset(key) {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return false;
    applySetup(preset.config);
    return true;
  }
  var QUESTIONS = [
    {
      key: "groups",
      title: "What may others do to you? (tick any)",
      multi: true,
      options: [
        { value: "movement", label: "Hold you still, quiet, kneeling; block the wardrobe" },
        { value: "undress", label: "Undress you, and stop you touching yourself" },
        { value: "arousal", label: "Set your arousal, force or deny an orgasm" },
        { value: "compel", label: "Make you perform actions \u2014 touch yourself on command" },
        { value: "perception", label: "Make you not notice things, or misread your own clothes" },
        { value: "lasting", label: "Plant triggers and suggestions that outlive the trance" }
      ]
    },
    {
      key: "access",
      title: "How easily should they reach those?",
      multi: false,
      options: [
        { value: "easy", label: "Easy \u2014 even a shallow trance is enough" },
        { value: "earned", label: "Earned \u2014 the deeper things need a deeper trance (recommended)" },
        { value: "deep", label: "Only deep \u2014 hardest to reach, nothing casual" }
      ]
    },
    {
      key: "arousal",
      title: "Can arousal stand in for trust on the shallow things?",
      multi: false,
      options: [
        { value: "yes", label: "Yes \u2014 being worked up can open the shallow, session-only effects" },
        { value: "no", label: "No \u2014 only trust ever counts" }
      ]
    },
    {
      key: "honour",
      title: "How much do you trust a hypnotist's claim to be skilled?",
      multi: false,
      options: [
        { value: "ignore", label: "Not at all \u2014 their practice never helps against me" },
        { value: "trusted", label: "Only from people I already know (recommended)" },
        { value: "capped", label: "From anyone, up to a point" }
      ]
    },
    {
      key: "decay",
      title: "Should planted triggers fade if they are not kept up?",
      multi: false,
      options: [
        { value: "yes", label: "Yes \u2014 they weaken over time without reinforcement" },
        { value: "no", label: "No \u2014 a trigger stays until it is removed" }
      ]
    }
  ];
  function wizardConfig(answers2) {
    const groups = answers2.groups ?? /* @__PURE__ */ new Set();
    const features = [];
    for (const g of groups) features.push(...GROUP_FEATURES[g] ?? []);
    return {
      features,
      access: answers2.access ?? "earned",
      arousalShortcut: (answers2.arousal ?? "yes") === "yes",
      honour: answers2.honour ?? "trusted",
      triggersFade: (answers2.decay ?? "no") === "yes"
    };
  }
  var forced = false;
  var stage = "welcome";
  var answers = {};
  function shouldShowWizard() {
    return forced || getStarterState() === "new";
  }
  function startWizard() {
    forced = true;
    stage = "welcome";
    for (const k of Object.keys(answers)) delete answers[k];
  }
  function finish() {
    forced = false;
    stage = "welcome";
  }
  function cancelWizard() {
    for (const k of Object.keys(answers)) delete answers[k];
    if (getStarterState() === "new") setStarterState("done");
    finish();
  }
  var WZ_LEFT = 260;
  var WZ_WIDTH = 1480;
  var WZ_TOP = PANEL_TOP;
  var WZ_HEIGHT = PANEL_HEIGHT;
  var CONTENT_X = WZ_LEFT + 40;
  var CONTENT_MAX = WZ_WIDTH - 80;
  var OPT_TOP = WZ_TOP + 150;
  var OPT_HEIGHT = 60;
  var OPT_GAP = 14;
  var OPT_WIDTH = WZ_WIDTH - 80;
  var NAV_TOP = WZ_TOP + WZ_HEIGHT - 76;
  var NAV_HEIGHT = 56;
  var NAV_FORWARD_LEFT = WZ_LEFT + WZ_WIDTH - 40 - 200;
  var NAV_CANCEL_LEFT = NAV_FORWARD_LEFT - 20 - 200;
  function optionTop(i) {
    return OPT_TOP + i * (OPT_HEIGHT + OPT_GAP);
  }
  function selected(q, value) {
    const a = answers[q.key];
    return q.multi ? a instanceof Set && a.has(value) : a === value;
  }
  function drawWizard() {
    DrawText("Erotic Chat Hypnosis Suite (ECHS) \u2014 setup", MainCanvasWidth / 2, WZ_TOP - 40, "Black");
    DrawRect(WZ_LEFT, WZ_TOP, WZ_WIDTH, WZ_HEIGHT, "White");
    DrawEmptyRect(WZ_LEFT, WZ_TOP, WZ_WIDTH, WZ_HEIGHT, "Black", 3);
    if (stage === "welcome") return drawWelcome();
    if (stage === "summary") return drawSummary();
    const q = QUESTIONS[stage];
    drawLeftText(q.title, CONTENT_X, WZ_TOP + 70, "Black");
    drawLeftText(q.multi ? "Tick any that apply." : "Choose one.", CONTENT_X, WZ_TOP + 110, "Gray");
    q.options.forEach((opt, i) => {
      const on = selected(q, opt.value);
      DrawButton(
        CONTENT_X,
        optionTop(i),
        OPT_WIDTH,
        OPT_HEIGHT,
        `${on ? "\u2713  " : ""}${opt.label}`,
        on ? "#dfe9df" : "White",
        "",
        ""
      );
    });
    drawNav(typeof stage === "number" && stage > 0, "Next");
    DrawText(`${stage + 1} of ${QUESTIONS.length}`, WZ_LEFT + WZ_WIDTH / 2, NAV_TOP + NAV_HEIGHT / 2, "Gray");
  }
  function drawWelcome() {
    drawLeftText("Welcome. Nothing works until you set some of it up.", CONTENT_X, WZ_TOP + 66, "Black");
    drawLeftTextFit(
      "Pick a starting point, or answer a few questions. You can change any of it afterward.",
      CONTENT_X,
      WZ_TOP + 104,
      CONTENT_MAX,
      "Gray"
    );
    PRESETS.forEach((p, i) => {
      const top = WZ_TOP + 150 + i * 90;
      DrawButton(CONTENT_X, top, 360, 64, p.name, "White", "", "");
      drawLeftTextWrap(p.blurb, CONTENT_X + 384, top + 32, CONTENT_MAX - 400, 84, "#333");
    });
    const bottom = WZ_TOP + 150 + PRESETS.length * 90 + 14;
    DrawButton(CONTENT_X, bottom, 500, 60, "Answer a few questions instead", "#e8e8ff", "", "");
    DrawButton(CONTENT_X + 520, bottom, 300, 60, "Skip \u2014 I'll set it up myself", "White", "", "");
  }
  function drawSummary() {
    const cfg = wizardConfig(answers);
    drawLeftText("Ready to apply", CONTENT_X, WZ_TOP + 70, "Black");
    const lines = describeConfig(cfg);
    lines.forEach((l, i) => drawLeftTextFit(l, CONTENT_X, WZ_TOP + 120 + i * 40, CONTENT_MAX, "#222"));
    drawNav(true, "Apply");
  }
  function describeConfig(cfg) {
    const groupNames = {
      movement: "movement & speech",
      undress: "undressing & touch",
      arousal: "arousal",
      perception: "perception tricks",
      compel: "made to act",
      lasting: "lasting triggers"
    };
    const chosen = Object.keys(GROUP_FEATURES).filter((g) => GROUP_FEATURES[g].every((k) => cfg.features.includes(k)));
    return [
      `Allowed: ${chosen.length ? chosen.map((g) => groupNames[g]).join(", ") : "nothing \u2014 hypnosis stays off"}.`,
      `Reached: ${cfg.access === "easy" ? "easily, even shallow" : cfg.access === "deep" ? "only when deeply under" : "earned, deeper things need a deeper trance"}.`,
      `Arousal as a shortcut: ${cfg.arousalShortcut ? "yes" : "no"}.`,
      `A hypnotist's skill: ${cfg.honour === "ignore" ? "ignored" : cfg.honour === "trusted" ? "from people you trust" : "from anyone, capped"}.`,
      `Triggers: ${cfg.triggersFade ? "fade over time" : "stay until removed"}.`,
      "You can change every one of these on the tabs afterward."
    ];
  }
  function drawNav(showBack, forward) {
    if (showBack) DrawButton(CONTENT_X, NAV_TOP, 160, NAV_HEIGHT, "Back", "White", "", "");
    DrawButton(NAV_CANCEL_LEFT, NAV_TOP, 200, NAV_HEIGHT, "Cancel", "White", "", "Leave setup without changing anything");
    DrawButton(NAV_FORWARD_LEFT, NAV_TOP, 200, NAV_HEIGHT, forward, "#dfe9df", "", "");
  }
  function clickWizard() {
    if (stage === "welcome") return clickWelcome();
    if (navCancelHit()) {
      cancelWizard();
      return true;
    }
    if (stage === "summary") {
      if (navForwardHit()) {
        applySetup(wizardConfig(answers));
        finish();
      } else if (navBackHit()) {
        stage = QUESTIONS.length - 1;
      }
      return true;
    }
    const q = QUESTIONS[stage];
    for (let i = 0; i < q.options.length; i++) {
      if (MouseIn(CONTENT_X, optionTop(i), OPT_WIDTH, OPT_HEIGHT)) {
        toggleAnswer(q, q.options[i].value);
        return true;
      }
    }
    if (navForwardHit()) {
      stage = stage + 1 >= QUESTIONS.length ? "summary" : stage + 1;
    } else if (navBackHit() && stage > 0) {
      stage = stage - 1;
    }
    return true;
  }
  function toggleAnswer(q, value) {
    if (!q.multi) {
      answers[q.key] = value;
      return;
    }
    const cur = answers[q.key] instanceof Set ? answers[q.key] : /* @__PURE__ */ new Set();
    cur.has(value) ? cur.delete(value) : cur.add(value);
    answers[q.key] = cur;
  }
  function clickWelcome() {
    PRESETS.forEach((p, i) => {
      if (MouseIn(CONTENT_X, WZ_TOP + 150 + i * 90, 360, 64)) {
        applyPreset(p.key);
        finish();
      }
    });
    const bottom = WZ_TOP + 150 + PRESETS.length * 90 + 14;
    if (MouseIn(CONTENT_X, bottom, 500, 60)) {
      stage = 0;
    } else if (MouseIn(CONTENT_X + 520, bottom, 300, 60)) {
      setStarterState("done");
      finish();
    }
    return true;
  }
  function navForwardHit() {
    return MouseIn(NAV_FORWARD_LEFT, NAV_TOP, 200, NAV_HEIGHT);
  }
  function navCancelHit() {
    return MouseIn(NAV_CANCEL_LEFT, NAV_TOP, 200, NAV_HEIGHT);
  }
  function navBackHit() {
    return MouseIn(CONTENT_X, NAV_TOP, 160, NAV_HEIGHT);
  }

  // src/menu.ts
  var TABS2 = [
    {
      name: "Permissions",
      blurb: "What others may do to you. All off by default. Triggers are persistent and outlive the session.",
      rows: [
        { key: "hypnoEnabled", label: "Hypnosis Enabled" },
        { key: "movementRestriction", label: "Movement Restriction" },
        { key: "clothingRestriction", label: "Clothing Restriction" },
        { key: "postureControl", label: "Posture Control" },
        { key: "followControl", label: "Follow / Leash" },
        { key: "speechRestriction", label: "Speech Restriction" },
        { key: "selfTouchControl", label: "Self-Touch Control" },
        { key: "compelActivity", label: "Made to Act (touch yourself on command)" },
        { key: "compelTouchOthers", label: "Made to Touch Others (needs Made to Act)" },
        { key: "arousalControl", label: "Arousal & Orgasm" },
        { key: "illusionControl", label: "Clothing Illusion (you see old clothes)" },
        { key: "undressControl", label: "Undressing" },
        { key: "lockedWhileHypnotized", label: "Lock settings while a session is on you" }
      ],
      extra: drawAttemptControl,
      clickExtra: clickAttemptControl
    },
    {
      name: "Trance Defaults",
      blurb: "What being under is like, and what the room sees of it. On by default \u2014 this is the trance itself, not something granted.",
      rows: [
        { key: "tranceCannotMove", label: "Cannot Move" },
        { key: "tranceCannotSpeak", label: "Cannot Speak" },
        { key: "blockOOC", label: "Silence OOC too (text in parentheses)" },
        { key: "tranceScreenFade", label: "Screen Fade" },
        { key: "tranceClothingFreeze", label: "Clothes Look Unchanged" },
        { key: "roomSeesReactions", label: "Others See Your Reactions" },
        { key: "releaseOnDisconnect", label: "Release everything if you disconnect" }
      ]
    },
    {
      name: "Awareness",
      blurb: "What you can be made unaware of. Hides the chat message only: your own screen still shows the truth (that is Clothing Illusion), and arousal still applies.",
      rows: [
        { key: "suppressClothing", label: "Clothing Changes" },
        { key: "suppressBondage", label: "Bondage Changes" },
        { key: "suppressActivities", label: "Touches / Activities" },
        { key: "suppressTriggerSetup", label: "Trigger setup (hide what is planted)" }
      ]
    },
    {
      // Triggers earned their own tab once there were three settings for them — a
      // permission, a scope and a duration. DW asked where the duration belonged, and
      // the honest answer was "nowhere yet".
      name: "Triggers",
      blurb: "Things that outlast the session. Both need a Deep trance by default, on earned depth \u2014 though the Depth tab can let arousal reach them, at the price of fading fast.",
      rows: [
        { key: "triggerControl", label: "Allow triggers to be planted in you" },
        { key: "carryForward", label: "Suggestions that outlive the trance" },
        { key: "selfTrigger", label: "You can fire your own triggers" },
        { key: "showTriggerWords", label: "Show trigger words when you list them" }
      ],
      extra: drawTriggerControls
    },
    {
      // Depth earned its own tab rather than a column beside the permissions: thirteen
      // features times a tier control is more than the Permissions tab can carry, and the
      // two questions are genuinely different anyway. The checkbox asks "may they ever";
      // this asks "how far under do I have to be first".
      name: "Depth",
      blurb: "How deep you must be before each thing can reach you. The checkbox still has to be on.",
      render: drawDepthGates,
      clickExtra: clickDepthGates
    },
    {
      name: "Stats",
      blurb: "Trust and experience. Counts are shown because they are what is actually stored.",
      render: drawStats
    }
  ];
  var STATS_TAB = TABS2[TABS2.length - 1];
  var BASE_TABS = TABS2.slice(0, TABS2.length - 1);
  var showAdvanced = false;
  function visibleTabs() {
    return showAdvanced ? [...BASE_TABS, STATS_TAB] : BASE_TABS;
  }
  function advancedButtonTop() {
    return tabTop(visibleTabs().length) + 4;
  }
  var ADVANCED_BUTTON_HEIGHT = 52;
  var activeTab2 = 0;
  var HELP_LEFT2 = 1700;
  var SETUP_WIDTH = 170;
  var SETUP_LEFT = HELP_LEFT2 - SETUP_WIDTH - 20;
  var HELP_TOP2 = BACK_TOP;
  var HELP_SIZE = BACK_SIZE;
  var BOX_LEFT = CONTENT_LEFT;
  var BOX_SIZE = 70;
  var ROW_TOP_START = 280;
  var ROW_SPACING = 78;
  var STAT_NAME_X = BOX_LEFT;
  var STAT_VALUE_X = BOX_LEFT + 460;
  var STAT_DETAIL_X = BOX_LEFT + 620;
  var STAT_NAME_MAX = 440;
  var STAT_LINE_HEIGHT = 40;
  var STAT_EXPERIENCE_Y = 290;
  var STAT_HEADER_Y = 330;
  var STAT_FIRST_ROW_Y = 370;
  var STAT_ROWS_PER_PAGE = 7;
  var PAGE_BUTTON_TOP2 = 635;
  var PAGE_BUTTON_WIDTH2 = 110;
  var PAGE_BUTTON_HEIGHT2 = 46;
  var PAGE_PREV_LEFT2 = BOX_LEFT;
  var PAGE_NEXT_LEFT2 = BOX_LEFT + 130;
  var statPage = 0;
  var DATA_BUTTON_TOP = 740;
  var DATA_BUTTON_WIDTH = 200;
  var DATA_BUTTON_HEIGHT = 60;
  var DATA_BUTTON_GAP = 20;
  var DATA_BUTTONS = ["Export", "Import", "Reset"];
  var resetArmedUntil = 0;
  var RESET_ARM_MS = 5e3;
  function dataButtonLeft(index) {
    return BOX_LEFT + index * (DATA_BUTTON_WIDTH + DATA_BUTTON_GAP);
  }
  var ATTEMPT_BUTTON_LEFT = BOX_LEFT;
  var ATTEMPT_BUTTON_TOP = 740;
  var ATTEMPT_BUTTON_WIDTH = 520;
  var ATTEMPT_BUTTON_HEIGHT = 44;
  var ATTEMPT_CAPTION_Y = 826;
  function drawAttemptControl() {
    const locked = settingsLocked();
    DrawButton(
      ATTEMPT_BUTTON_LEFT,
      ATTEMPT_BUTTON_TOP,
      ATTEMPT_BUTTON_WIDTH,
      ATTEMPT_BUTTON_HEIGHT,
      `Attempts before they must wait: ${getMaxAttempts()}`,
      locked ? "#ddd" : "White",
      "",
      locked ? "Locked until this session ends" : "How many tries one hypnotist gets in a row",
      locked
    );
    drawLeftTextFit(
      "When they run out, they cannot try you again for ten minutes.",
      ATTEMPT_BUTTON_LEFT,
      ATTEMPT_CAPTION_Y,
      PANEL_LEFT + PANEL_WIDTH - BOX_LEFT - 40,
      locked ? "Gray" : "#555"
    );
  }
  function clickAttemptControl() {
    if (!MouseIn(ATTEMPT_BUTTON_LEFT, ATTEMPT_BUTTON_TOP, ATTEMPT_BUTTON_WIDTH, ATTEMPT_BUTTON_HEIGHT)) return false;
    if (settingsLocked()) return true;
    const next = setMaxAttempts(nextAttemptLimit(getMaxAttempts()));
    log(`induction attempt limit set to ${next}`);
    return true;
  }
  var DEPTH_ROW_TOP = 270;
  var DEPTH_ROW_HEIGHT = 52;
  var DEPTH_ROWS_PER_PAGE = 7;
  var DEPTH_TIER_LEFT = BOX_LEFT + 890;
  var DEPTH_LABEL_MAX = 890 - 40;
  var DEPTH_TIER_WIDTH = 210;
  var DEPTH_BUTTON_HEIGHT = 44;
  var CHEM_TOGGLE_LEFT = DEPTH_TIER_LEFT + DEPTH_TIER_WIDTH + 12;
  var CHEM_TOGGLE_WIDTH = 136;
  var SCOPE_BUTTON_LEFT = BOX_LEFT;
  var SCOPE_BUTTON_TOP = 740;
  var SCOPE_BUTTON_WIDTH = 430;
  var DEFAULTS_BUTTON_LEFT = BOX_LEFT + 470;
  var DEFAULTS_BUTTON_WIDTH = 240;
  var HONOUR_BUTTON_TOP = SCOPE_BUTTON_TOP + 58;
  var HONOUR_BUTTON_WIDTH = 720;
  var depthPage = 0;
  function depthPageCount() {
    return Math.max(1, Math.ceil(DEPTH_GATES.length / DEPTH_ROWS_PER_PAGE));
  }
  function visibleGates() {
    const from = depthPage * DEPTH_ROWS_PER_PAGE;
    return DEPTH_GATES.slice(from, from + DEPTH_ROWS_PER_PAGE);
  }
  function drawDepthGates() {
    const locked = settingsLocked();
    const features = getFeatures();
    visibleGates().forEach((gate, i) => {
      const top = DEPTH_ROW_TOP + i * DEPTH_ROW_HEIGHT;
      const granted = !!features[gate.key];
      drawLeftTextFit(
        gate.label,
        BOX_LEFT,
        top + 30,
        DEPTH_LABEL_MAX,
        granted ? "Black" : "Gray"
      );
      DrawButton(
        DEPTH_TIER_LEFT,
        top,
        DEPTH_TIER_WIDTH,
        DEPTH_BUTTON_HEIGHT,
        tierLabel(requiredTier(gate.key)),
        locked ? "#ddd" : granted ? "White" : "#eee",
        "",
        locked ? "Locked until this session ends" : "Click to require a deeper trance",
        locked
      );
      if (gate.earnedOnly) {
        const toggleable = isChemicalToggleable(gate.key);
        const open2 = toggleable && getChemicalReach(gate.key);
        DrawButton(
          CHEM_TOGGLE_LEFT,
          top,
          CHEM_TOGGLE_WIDTH,
          DEPTH_BUTTON_HEIGHT,
          open2 ? "arousal ok" : "earned only",
          locked || !toggleable ? "#eee" : open2 ? "#e7efe7" : "White",
          "",
          !toggleable ? "Waiting on carry-forward decay before arousal can be allowed here." : open2 ? "Arousal can reach this \u2014 but anything seeded that way fades fast. Click for trust only." : "Only trust reaches this. Click to let arousal too \u2014 it fades fast.",
          locked || !toggleable
        );
      }
    });
    if (depthPageCount() > 1) {
      DrawButton(PAGE_PREV_LEFT2, PAGE_BUTTON_TOP2, PAGE_BUTTON_WIDTH2, PAGE_BUTTON_HEIGHT2, "Prev", "White", "", "", depthPage === 0);
      DrawButton(
        PAGE_NEXT_LEFT2,
        PAGE_BUTTON_TOP2,
        PAGE_BUTTON_WIDTH2,
        PAGE_BUTTON_HEIGHT2,
        "Next",
        "White",
        "",
        "",
        depthPage >= depthPageCount() - 1
      );
      drawLeftText(`page ${depthPage + 1} of ${depthPageCount()}`, PAGE_NEXT_LEFT2 + 130, PAGE_BUTTON_TOP2 + 30, "Gray");
    }
    const scope = CHEMICAL_SCOPES.find((c) => c.key === getChemicalScope())?.label ?? "Arousal only";
    DrawButton(
      SCOPE_BUTTON_LEFT,
      SCOPE_BUTTON_TOP,
      SCOPE_BUTTON_WIDTH,
      DEPTH_BUTTON_HEIGHT,
      `Chemicals count: ${scope}`,
      locked ? "#ddd" : "White",
      "",
      "What may push you deeper besides trust. Never applies to the three above that say otherwise.",
      locked
    );
    DrawButton(
      DEFAULTS_BUTTON_LEFT,
      SCOPE_BUTTON_TOP,
      DEFAULTS_BUTTON_WIDTH,
      DEPTH_BUTTON_HEIGHT,
      "Reset to defaults",
      locked ? "#ddd" : "White",
      "",
      "Forget every tier you have changed",
      locked
    );
    const honour = SKILL_HONOUR_RUNGS.find((r) => r.key === getSkillHonour())?.label ?? "Only from people I trust";
    DrawButton(
      SCOPE_BUTTON_LEFT,
      HONOUR_BUTTON_TOP,
      HONOUR_BUTTON_WIDTH,
      DEPTH_BUTTON_HEIGHT,
      `A hypnotist's skill: ${honour}`,
      locked ? "#ddd" : "White",
      "",
      "How much of another hypnotist's own practice is allowed to help them put you under. Never reaches the three above that say otherwise, and their word for it is never taken on trust.",
      locked
    );
    const here = isHypnotized() ? `You are ${tierLabel(currentTier())} right now.` : "You are not under.";
    drawLeftText(here, DEFAULTS_BUTTON_LEFT + DEFAULTS_BUTTON_WIDTH + 40, SCOPE_BUTTON_TOP + 30, "Gray");
  }
  function clickDepthGates() {
    if (settingsLocked()) return true;
    if (depthPageCount() > 1) {
      if (MouseIn(PAGE_PREV_LEFT2, PAGE_BUTTON_TOP2, PAGE_BUTTON_WIDTH2, PAGE_BUTTON_HEIGHT2)) {
        depthPage = Math.max(0, depthPage - 1);
        return true;
      }
      if (MouseIn(PAGE_NEXT_LEFT2, PAGE_BUTTON_TOP2, PAGE_BUTTON_WIDTH2, PAGE_BUTTON_HEIGHT2)) {
        depthPage = Math.min(depthPageCount() - 1, depthPage + 1);
        return true;
      }
    }
    if (MouseIn(SCOPE_BUTTON_LEFT, SCOPE_BUTTON_TOP, SCOPE_BUTTON_WIDTH, DEPTH_BUTTON_HEIGHT)) {
      const next = nextScope(getChemicalScope());
      setChemicalScope(next);
      log(`chemical scope set to ${next}`);
      return true;
    }
    if (MouseIn(DEFAULTS_BUTTON_LEFT, SCOPE_BUTTON_TOP, DEFAULTS_BUTTON_WIDTH, DEPTH_BUTTON_HEIGHT)) {
      clearDepthOverrides();
      notifyLocal("Depth requirements reset to their defaults.");
      return true;
    }
    if (MouseIn(SCOPE_BUTTON_LEFT, HONOUR_BUTTON_TOP, HONOUR_BUTTON_WIDTH, DEPTH_BUTTON_HEIGHT)) {
      const next = nextSkillHonour(getSkillHonour());
      setSkillHonour(next);
      log(`skill honour set to ${next}`);
      return true;
    }
    const gates = visibleGates();
    for (let i = 0; i < gates.length; i++) {
      const top = DEPTH_ROW_TOP + i * DEPTH_ROW_HEIGHT;
      if (MouseIn(DEPTH_TIER_LEFT, top, DEPTH_TIER_WIDTH, DEPTH_BUTTON_HEIGHT)) {
        const next = nextTier(requiredTier(gates[i].key));
        setDepthOverride(gates[i].key, next);
        log(`${gates[i].key} now needs ${next}`);
        return true;
      }
      if (MouseIn(CHEM_TOGGLE_LEFT, top, CHEM_TOGGLE_WIDTH, DEPTH_BUTTON_HEIGHT) && isChemicalToggleable(gates[i].key)) {
        const now = !getChemicalReach(gates[i].key);
        setChemicalReach(gates[i].key, now);
        notifyLocal(
          now ? `${gates[i].label}: arousal may reach this now \u2014 anything seeded this way fades fast.` : `${gates[i].label}: back to trust only.`
        );
        return true;
      }
    }
    return false;
  }
  function notifyLocal(message) {
    log(message);
    tellPlayer(message);
  }
  var IMPORT_LOCKED_MESSAGE = "Import refused: your settings are locked until this session ends.";
  function clickDataButton(index) {
    const name = DATA_BUTTONS[index];
    if (name === "Export") {
      const blob = exportSettings();
      navigator.clipboard?.writeText(blob).then(
        () => notifyLocal("Settings copied to clipboard. Keep it somewhere safe."),
        () => {
          notifyLocal("Could not reach the clipboard \u2014 copy the line below instead:");
          notifyLocal(blob);
        }
      );
      return;
    }
    if (name === "Import") {
      if (settingsLocked()) {
        notifyLocal(IMPORT_LOCKED_MESSAGE);
        return;
      }
      navigator.clipboard?.readText().then(
        (text) => {
          if (settingsLocked()) {
            notifyLocal(IMPORT_LOCKED_MESSAGE);
            return;
          }
          const result = importSettings(text);
          notifyLocal(result.ok ? `Imported: ${result.message}` : `Import failed: ${result.message}`);
        },
        () => notifyLocal("Could not read the clipboard \u2014 use /hypno import <blob> instead.")
      );
      return;
    }
    if (Date.now() > resetArmedUntil) {
      resetArmedUntil = Date.now() + RESET_ARM_MS;
      notifyLocal("Click Reset again within 5 seconds to erase all trust, experience and settings.");
      return;
    }
    resetArmedUntil = 0;
    notifyLocal(resetSettings());
  }
  function drawDataButtons() {
    const armed = Date.now() < resetArmedUntil;
    const importLocked = settingsLocked();
    DATA_BUTTONS.forEach((name, i) => {
      const isReset = name === "Reset";
      const locked = name === "Import" && importLocked;
      DrawButton(
        dataButtonLeft(i),
        DATA_BUTTON_TOP,
        DATA_BUTTON_WIDTH,
        DATA_BUTTON_HEIGHT,
        isReset && armed ? "Confirm?" : name,
        isReset ? armed ? "#ffb3b3" : "#ffe0e0" : locked ? "#ddd" : "White",
        "",
        isReset ? "Erases everything \u2014 asks once first" : locked ? "Locked until this session ends" : `${name} via clipboard`,
        locked
      );
    });
  }
  var SCOPE_ID = "HypnosisAddonTriggerScope";
  var SCOPE_LABEL_Y = 630;
  var SCOPE_CENTRE_X = CONTENT_LEFT + 380;
  var SCOPE_CENTRE_Y = 675;
  var SCOPE_WIDTH = 760;
  var SCOPE_HEIGHT = 56;
  var DECAY_ID = "HypnosisAddonDecayRate";
  var DECAY_LABEL_X = CONTENT_LEFT + 560;
  var DECAY_LABEL_Y = 660;
  var DECAY_CENTRE_X = CONTENT_LEFT + 940;
  var DECAY_CENTRE_Y = 705;
  var DECAY_WIDTH = 520;
  var DECAY_HEIGHT = 46;
  var TRIGGER_DECAY_ID = "HypnosisAddonTriggerDecay";
  var TRIGGER_DECAY_LABEL_X = CONTENT_LEFT + 680;
  var TRIGGER_DECAY_LABEL_MAX = 500;
  var TRIGGER_DECAY_CENTRE_X = CONTENT_LEFT + 930;
  var TRIGGER_DECAY_WIDTH = 500;
  var DURATION_ID = "HypnosisAddonTriggerDuration";
  var DURATION_LABEL_Y = 760;
  var DURATION_CENTRE_X = CONTENT_LEFT + 70;
  var DURATION_CENTRE_Y = 802;
  var DURATION_WIDTH = 140;
  var DURATION_HEIGHT = 56;
  var DECAY_CAPTION_Y = 858;
  function removeScopeControl() {
    for (const id of [SCOPE_ID, DURATION_ID, DECAY_ID, TRIGGER_DECAY_ID]) {
      if (document.getElementById(id)) ElementRemove(id);
    }
  }
  function syncTabControls(tabName) {
    if (tabName !== "Triggers") {
      if (document.getElementById(SCOPE_ID)) ElementRemove(SCOPE_ID);
      if (document.getElementById(DURATION_ID)) ElementRemove(DURATION_ID);
      if (document.getElementById(TRIGGER_DECAY_ID)) ElementRemove(TRIGGER_DECAY_ID);
    }
    if (tabName !== "Stats" && document.getElementById(DECAY_ID)) ElementRemove(DECAY_ID);
  }
  function drawDecayControl() {
    const locked = settingsLocked();
    drawLeftText("Trust fades when you don't see someone:", DECAY_LABEL_X, DECAY_LABEL_Y, locked ? "Gray" : "Black");
    let element = document.getElementById(DECAY_ID);
    if (!element) {
      element = ElementCreateDropdown(
        DECAY_ID,
        DECAY_RATES.map((r) => r.label),
        function() {
          setDecayRate(DECAY_RATES[this.selectedIndex]?.key ?? "never");
          log(`trust decay set to ${getDecayRate()}`);
        }
      );
    }
    const index = DECAY_RATES.findIndex((r) => r.key === getDecayRate());
    if (index >= 0 && element.selectedIndex !== index) element.selectedIndex = index;
    element.disabled = locked;
    ElementPosition(DECAY_ID, DECAY_CENTRE_X, DECAY_CENTRE_Y, DECAY_WIDTH, DECAY_HEIGHT);
  }
  function drawTriggerControls() {
    const locked = settingsLocked();
    drawScopeControl(locked);
    drawDurationControl(locked);
    drawTriggerDecayControl(locked);
  }
  function drawTriggerDecayControl(locked) {
    drawLeftTextFit(
      "Triggers fade without reinforcement:",
      TRIGGER_DECAY_LABEL_X,
      DURATION_LABEL_Y,
      TRIGGER_DECAY_LABEL_MAX,
      locked ? "Gray" : "Black"
    );
    let element = document.getElementById(TRIGGER_DECAY_ID);
    if (!element) {
      element = ElementCreateDropdown(
        TRIGGER_DECAY_ID,
        DECAY_RATES.map((r) => r.label),
        function() {
          setTriggerDecayRate(DECAY_RATES[this.selectedIndex]?.key ?? "never");
          log(`trigger decay set to ${getTriggerDecayRate()}`);
        }
      );
    }
    const index = DECAY_RATES.findIndex((r) => r.key === getTriggerDecayRate());
    if (index >= 0 && element.selectedIndex !== index) element.selectedIndex = index;
    element.disabled = locked;
    ElementPosition(TRIGGER_DECAY_ID, TRIGGER_DECAY_CENTRE_X, DURATION_CENTRE_Y, TRIGGER_DECAY_WIDTH, DURATION_HEIGHT);
    drawLeftTextFit(
      decayLifetimeText(),
      TRIGGER_DECAY_LABEL_X,
      DECAY_CAPTION_Y,
      TRIGGER_DECAY_WIDTH,
      locked ? "Gray" : "#555"
    );
  }
  function drawDurationControl(locked) {
    drawLeftTextFit(
      "Minutes a fired trigger lasts (0 = until released):",
      CONTENT_LEFT,
      DURATION_LABEL_Y,
      460,
      locked ? "Gray" : "Black"
    );
    let element = document.getElementById(DURATION_ID);
    if (!element) {
      element = ElementCreateInput(DURATION_ID, "number", String(getTriggerDuration()), 4);
      element.min = "0";
      element.max = "1440";
      element.inputMode = "numeric";
      element.addEventListener("blur", function(event) {
        ElementNumberInputBlur.call(this, event);
        const saved = setTriggerDuration(Number(this.value));
        this.value = String(saved);
        log(`trigger duration set to ${saved} min`);
      });
      element.addEventListener("wheel", ElementNumberInputWheel);
    }
    if (document.activeElement !== element) element.value = String(getTriggerDuration());
    element.disabled = locked;
    ElementPosition(DURATION_ID, DURATION_CENTRE_X, DURATION_CENTRE_Y, DURATION_WIDTH, DURATION_HEIGHT);
  }
  function drawScopeControl(locked) {
    drawLeftText("Who else can fire triggers planted in you:", CONTENT_LEFT, SCOPE_LABEL_Y, locked ? "Gray" : "Black");
    let element = document.getElementById(SCOPE_ID);
    if (!element) {
      element = ElementCreateDropdown(
        SCOPE_ID,
        TRIGGER_SCOPES.map((s) => s.label),
        function() {
          setTriggerScope(TRIGGER_SCOPES[this.selectedIndex]?.key ?? "hypnotist");
          log(`trigger scope set to ${getTriggerScope()}`);
        }
      );
    }
    const index = TRIGGER_SCOPES.findIndex((s) => s.key === getTriggerScope());
    if (index >= 0 && element.selectedIndex !== index) element.selectedIndex = index;
    element.disabled = locked;
    ElementPosition(SCOPE_ID, SCOPE_CENTRE_X, SCOPE_CENTRE_Y, SCOPE_WIDTH, SCOPE_HEIGHT);
  }
  function statPageCount() {
    return Math.max(1, Math.ceil(trustStatRows().length / STAT_ROWS_PER_PAGE));
  }
  function drawStats() {
    const line = (y, name, value, detail, color = "Black") => {
      drawLeftTextFit(name, STAT_NAME_X, y, STAT_NAME_MAX, color);
      if (value) drawLeftText(value, STAT_VALUE_X, y, color);
      if (detail) drawLeftText(detail, STAT_DETAIL_X, y, "Gray");
    };
    drawDecayControl();
    line(STAT_EXPERIENCE_Y, "Experience", experienceValue().toFixed(1), `${rawExperience().toFixed(2)} from inductions`);
    line(STAT_HEADER_Y, "Trust", "value", "detail", "Gray");
    const rows = trustStatRows();
    if (!rows.length) {
      drawLeftText("Nobody yet \u2014 trust builds from conversation in the same room.", STAT_NAME_X, STAT_FIRST_ROW_Y, "Gray");
      drawDataButtons();
      return;
    }
    const pages = statPageCount();
    if (statPage >= pages) statPage = pages - 1;
    const start = statPage * STAT_ROWS_PER_PAGE;
    rows.slice(start, start + STAT_ROWS_PER_PAGE).forEach((row, i) => {
      line(STAT_FIRST_ROW_Y + i * STAT_LINE_HEIGHT, row.name, row.trust, row.detail);
    });
    if (pages > 1) {
      DrawButton(PAGE_PREV_LEFT2, PAGE_BUTTON_TOP2, PAGE_BUTTON_WIDTH2, PAGE_BUTTON_HEIGHT2, "Prev", "White", "", "", statPage === 0);
      DrawButton(PAGE_NEXT_LEFT2, PAGE_BUTTON_TOP2, PAGE_BUTTON_WIDTH2, PAGE_BUTTON_HEIGHT2, "Next", "White", "", "", statPage >= pages - 1);
      drawLeftText(
        `${statPage + 1} / ${pages}  \xB7  ${rows.length} people`,
        PAGE_NEXT_LEFT2 + PAGE_BUTTON_WIDTH2 + 24,
        PAGE_BUTTON_TOP2 + PAGE_BUTTON_HEIGHT2 / 2,
        "Gray"
      );
    }
    drawDataButtons();
  }
  var MAX_ROWS_PER_COLUMN = 6;
  var COLUMN_TWO_LEFT = BOX_LEFT + 650;
  var ROW_LABEL_MAX = 480;
  function rowPosition(index, total) {
    const twoColumn = total > MAX_ROWS_PER_COLUMN;
    const perColumn = twoColumn ? Math.ceil(total / 2) : total;
    const column = Math.floor(index / perColumn);
    const row = index % perColumn;
    return {
      left: column === 0 ? BOX_LEFT : COLUMN_TWO_LEFT,
      top: ROW_TOP_START + row * ROW_SPACING,
      // A single column has the whole panel; two share it, and the left one must stop before
      // the right one's checkbox rather than running under it.
      labelMax: twoColumn ? ROW_LABEL_MAX : PANEL_LEFT + PANEL_WIDTH - BOX_LEFT - BOX_SIZE - 60
    };
  }
  function settingsLocked() {
    return getFeatures().lockedWhileHypnotized && isSessionLive();
  }
  var EXTENSION_ID = "HypnosisAddon";
  var EXTENSION_BUTTON_TEXT = "ECHS Hypnosis";
  async function openHelpScreen() {
    try {
      if (typeof PreferenceOpenSubscreen !== "function" || typeof PreferenceExtensionsSettings === "undefined") {
        return false;
      }
      await PreferenceOpenSubscreen("Extensions");
      const screen = PreferenceExtensionsSettings[EXTENSION_ID];
      if (!screen) return false;
      PreferenceExtensionsCurrent = screen;
      if (typeof ElementWrap === "function" && typeof PreferenceIDs !== "undefined") {
        ElementWrap(PreferenceIDs.subscreen)?.toggleAttribute("hidden", true);
      }
      screen.load?.();
      openHelp();
      return true;
    } catch {
      return false;
    }
  }
  function installMenu() {
    PreferenceRegisterExtensionSetting({
      Identifier: EXTENSION_ID,
      ButtonText: EXTENSION_BUTTON_TEXT,
      // Our spiral icon beside the label in Preferences > Extensions (icon.ts). Undefined
      // if it could not be built, which BC accepts — the entry then shows text only.
      Image: SPIRAL_ICON,
      // Always open on the first tab — coming back to a screen part-way through a
      // previous visit's navigation is disorienting.
      load: () => {
        activeTab2 = 0;
        statPage = 0;
        removeScopeControl();
        closeHelp();
      },
      run: () => {
        if (isHelpOpen()) {
          removeScopeControl();
          drawHelp("Erotic Chat Hypnosis Suite (ECHS) \u2014 help");
          return;
        }
        if (shouldShowWizard() && !settingsLocked()) {
          removeScopeControl();
          DrawButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Exit");
          drawWizard();
          return;
        }
        DrawText(`Erotic Chat Hypnosis Suite (ECHS) v${"0.85.3"} \u2014 settings`, MainCanvasWidth / 2, TITLE_Y, "Black");
        DrawButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Exit");
        DrawButton(HELP_LEFT2, HELP_TOP2, HELP_SIZE, HELP_SIZE, "?", "White", "", "How this add-on works");
        if (!settingsLocked()) {
          DrawButton(SETUP_LEFT, HELP_TOP2, SETUP_WIDTH, HELP_SIZE, "Setup", "White", "", "Run the setup again");
        }
        const tabs = visibleTabs();
        if (activeTab2 >= tabs.length) activeTab2 = 0;
        drawTabsAndPanel(tabs.map((t) => t.name), activeTab2);
        DrawButton(
          TAB_LEFT,
          advancedButtonTop(),
          TAB_WIDTH,
          ADVANCED_BUTTON_HEIGHT,
          showAdvanced ? "Hide advanced" : "Advanced \u25B8",
          "White",
          "",
          showAdvanced ? "Hide the stats view" : "Trust and experience counts, sought out"
        );
        const tab = tabs[activeTab2];
        const locked = settingsLocked();
        drawLeftTextFit(
          locked ? "Locked while someone is working on you, until the session ends. /hypno safeword always works." : tab.blurb,
          BOX_LEFT,
          BLURB_Y,
          PANEL_LEFT + PANEL_WIDTH - BOX_LEFT - 40,
          "Gray"
        );
        syncTabControls(tab.name);
        if (tab.render) {
          tab.render();
          return;
        }
        const features = getFeatures();
        const rows = tab.rows ?? [];
        rows.forEach((row, i) => {
          const { left, top, labelMax } = rowPosition(i, rows.length);
          DrawCheckbox(left, top, BOX_SIZE, BOX_SIZE, "", features[row.key], locked);
          drawLeftTextFit(row.label, left + BOX_SIZE + 20, top + 26, labelMax, locked ? "Gray" : "Black");
        });
        tab.extra?.();
      },
      click: () => {
        if (shouldShowWizard() && !settingsLocked()) {
          if (MouseIn(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE)) {
            PreferenceSubscreenExtensionsClear();
            return;
          }
          clickWizard();
          return;
        }
        if (isHelpOpen()) {
          clickHelp();
          return;
        }
        if (!settingsLocked() && MouseIn(SETUP_LEFT, HELP_TOP2, SETUP_WIDTH, HELP_SIZE)) {
          startWizard();
          return;
        }
        if (MouseIn(HELP_LEFT2, HELP_TOP2, HELP_SIZE, HELP_SIZE)) {
          removeScopeControl();
          openHelp();
          return;
        }
        if (MouseIn(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE)) {
          PreferenceSubscreenExtensionsClear();
          return;
        }
        if (MouseIn(TAB_LEFT, advancedButtonTop(), TAB_WIDTH, ADVANCED_BUTTON_HEIGHT)) {
          showAdvanced = !showAdvanced;
          if (!showAdvanced && activeTab2 >= BASE_TABS.length) activeTab2 = 0;
          removeScopeControl();
          return;
        }
        const tabs = visibleTabs();
        const hitTab = tabHitIndex(tabs.length);
        if (hitTab !== null) {
          activeTab2 = hitTab;
          depthPage = 0;
          removeScopeControl();
          return;
        }
        if (tabs[activeTab2].clickExtra?.()) return;
        if (tabs[activeTab2].render) {
          if (MouseIn(PAGE_PREV_LEFT2, PAGE_BUTTON_TOP2, PAGE_BUTTON_WIDTH2, PAGE_BUTTON_HEIGHT2)) {
            statPage = Math.max(0, statPage - 1);
            return;
          }
          if (MouseIn(PAGE_NEXT_LEFT2, PAGE_BUTTON_TOP2, PAGE_BUTTON_WIDTH2, PAGE_BUTTON_HEIGHT2)) {
            statPage = Math.min(statPageCount() - 1, statPage + 1);
            return;
          }
          for (let i = 0; i < DATA_BUTTONS.length; i++) {
            if (MouseIn(dataButtonLeft(i), DATA_BUTTON_TOP, DATA_BUTTON_WIDTH, DATA_BUTTON_HEIGHT)) {
              clickDataButton(i);
              return;
            }
          }
          return;
        }
        if (settingsLocked()) return;
        const features = getFeatures();
        const clickRows = visibleTabs()[activeTab2].rows ?? [];
        clickRows.forEach((row, i) => {
          const { left, top } = rowPosition(i, clickRows.length);
          if (MouseIn(left, top, BOX_SIZE, BOX_SIZE)) {
            const next = !features[row.key];
            setFeature(row.key, next);
            onToggle(row.key, next);
            log(`${row.key} set to ${next}`);
          }
        });
      },
      // Both exit paths matter: exit() for our own back button, unload() for BC tearing
      // the screen down some other way. Missing either leaves the dropdown floating.
      // Both exit paths also close help: it is a module-level flag shared with the remote
      // panel, so leaving it set would greet the next screen with a help page.
      unload: () => {
        removeScopeControl();
        closeHelp();
      },
      exit: () => {
        removeScopeControl();
        closeHelp();
        return true;
      }
    });
  }
  function onToggle(key, enabled) {
    switch (key) {
      case "hypnoEnabled":
        if (!enabled) hardFloorStop();
        break;
      case "movementRestriction":
        if (!enabled) removeEffect("Freeze");
        break;
      case "clothingRestriction":
        if (!enabled) removeEffect("BlockWardrobe");
        break;
      case "postureControl":
        if (!enabled) clearSuggestedPose();
        break;
      case "speechRestriction":
      case "tranceCannotSpeak":
        if (!enabled) setSpeechBlocked(false);
        break;
      case "tranceCannotMove":
        if (!enabled) removeEffect("Freeze");
        break;
      case "tranceScreenFade":
        if (!enabled) setScreenFade(0);
        break;
      case "selfTouchControl":
        if (!enabled) clearSelfTouchBlocks();
        break;
      case "suppressClothing":
        if (!enabled) setSuppressed("clothing", false);
        break;
      case "suppressBondage":
        if (!enabled) setSuppressed("bondage", false);
        break;
      case "suppressActivities":
        if (!enabled) setSuppressed("activity", false);
        break;
      case "arousalControl":
        if (!enabled) {
          setNumb(false);
          clearOrgasmDenial();
        }
        break;
      case "illusionControl":
        if (!enabled) clearIllusion();
        break;
      case "lockedWhileHypnotized":
        break;
    }
  }

  // src/commands.ts
  var suppressNextAction = false;
  function consumeSuppressFlag() {
    if (!suppressNextAction) return false;
    suppressNextAction = false;
    return true;
  }
  function findCharacter(memberId) {
    return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find((c) => c?.MemberNumber === memberId);
  }
  function others() {
    return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).filter(
      (c) => c?.MemberNumber && c.MemberNumber !== Player?.MemberNumber
    );
  }
  function resolveTarget(token) {
    const t = (token ?? "").trim();
    if (!t) return null;
    if (/^\d+$/.test(t)) {
      const id = Number(t);
      return { id, name: findCharacter(id)?.Name ?? `#${id}` };
    }
    const lower = t.toLowerCase();
    const names = (c) => [c?.Name, c?.Nickname].filter(Boolean).map((n) => n.toLowerCase());
    const pool = others();
    const exact = pool.filter((c) => names(c).includes(lower));
    const matches = exact.length ? exact : pool.filter((c) => names(c).some((n) => n.startsWith(lower)));
    if (matches.length !== 1) return null;
    return { id: matches[0].MemberNumber, name: matches[0].Name };
  }
  var lastInduced = null;
  function startInduction(target) {
    lastInduced = target;
    const view = getSessionView(target.id);
    requestInduction(target.id);
    reply(
      view?.phase === "AttemptFailed" ? `Trying ${target.name} again.` : `Attempting an induction on ${target.name}.`
    );
    reply("They decide how to respond, on their own client. Watch for what happens next.");
  }
  function targetOrAsk(token, usage) {
    const resolved = resolveTarget(token);
    if (resolved) return resolved;
    const pool = others();
    if (!token.trim() && pool.length === 1) {
      return { id: pool[0].MemberNumber, name: pool[0].Name };
    }
    reply(token.trim() ? `No one here matches "${token.trim()}".` : "Who? Give a name or member number.");
    reply(usage);
    if (!pool.length) reply("Nobody else is in the room \u2014 you'll need a member number.");
    else reply(`In the room: ${pool.map((c) => `${c.Name} (${c.MemberNumber})`).join(", ")}`);
    return null;
  }
  function firstWord(args) {
    return (args ?? "").trim().split(/\s+/)[0] ?? "";
  }
  function reply(message) {
    log(message);
    tellPlayer(message);
  }
  var COMMAND_TAGS = ["hypno", "echs"];
  var GUIDE_LOCATION = `Preferences > Extensions > ${EXTENSION_BUTTON_TEXT} \u2014 the ? button (or the Help button in the remote panel).`;
  function menuLines() {
    return [
      "Erotic Chat Hypnosis Suite (ECHS) \u2014 most of this works by SPEAKING to someone in a session, not by typing.",
      "  /hypno help \u2014 open the full on-screen guide: what to say, trust, depth, triggers",
      "  /hypno commands \u2014 list every typed command",
      "  /hypno match <phrase> \u2014 check what a phrase would do, and why nothing happened",
      "  /hypno safeword \u2014 hard stop; clears everything, always works",
      "  (/echs is the same command as /hypno \u2014 either works, anywhere.)"
    ];
  }
  function commandListLines() {
    const ORDER = ["Session", "Diagnostics", "Data", "Testing"];
    const NOTE = {
      Session: "safeword never fails",
      Diagnostics: "look, change nothing",
      Data: "your settings & stats",
      Testing: "Hypno Testing room only"
    };
    const lines = ["Typed commands \u2014 most features are SPOKEN, not typed:"];
    for (const group of ORDER) {
      if (group === "Testing" && !isTestingMode()) continue;
      const inGroup = COMMANDS.filter((c) => c.group === group);
      if (!inGroup.length) continue;
      const tags = inGroup.map((c) => c.args ? `${c.Tag} ${c.args}` : c.Tag).join(", ");
      lines.push(`${group} (${NOTE[group]}): ${tags}`);
    }
    lines.push("Full illustrated guide: /hypno help \xB7 what a phrase does and why not: /hypno match <phrase>");
    return lines;
  }
  function installCommands() {
    const metaCommands = [
      {
        Tag: "help",
        Description: "Open the full on-screen guide",
        Action: () => {
          openHelpScreen().then((ok) => {
            if (!ok) reply(`Couldn't open the guide from here. It's under ${GUIDE_LOCATION}`);
          }).catch(() => reply(`Couldn't open the guide from here. It's under ${GUIDE_LOCATION}`));
        }
      },
      {
        Tag: "commands",
        Description: "List every typed command",
        Action: () => {
          for (const line of commandListLines()) reply(line);
        }
      }
    ];
    const hypnoCommand = (Tag) => ({
      Tag,
      Description: "Erotic Chat Hypnosis Suite \u2014 session control, diagnostics and test commands",
      Action: () => {
        for (const line of menuLines()) reply(line);
      },
      // Fold the argument hint into the Description BC renders, so its own help screen
      // shows it too rather than only our summary line.
      //
      // Every Testing-group command is gated to the testing room HERE, at the one place they
      // are all registered — so the gate covers the whole group at once, including the ones
      // (settrust, relate, …) that never carried their own runtime check and any added later,
      // rather than depending on each Action to remember to check. The help screen already
      // hides the group outside the room; this is what actually stops them running.
      Subcommands: [
        ...metaCommands.map((c) => ({ ...c })),
        ...COMMANDS.map(({ group, args, Description, ...cmd }) => ({
          ...cmd,
          Description: args ? `${args} \u2014 ${Description}` : Description,
          Action: group === "Testing" ? (a) => {
            if (!isTestingMode()) {
              reply("Not available \u2014 join the Hypno Testing room to use this test command.");
              return;
            }
            cmd.Action(a);
          } : cmd.Action
        }))
      ]
    });
    for (const tag of COMMAND_TAGS) CommandCombine(hypnoCommand(tag));
    installBotCommand();
  }
  function sendToBot(args) {
    if (!isTestingMode()) {
      reply("Not available \u2014 join the Hypno Testing room to use the test bot.");
      return;
    }
    const text = (args ?? "").trim();
    if (!text) {
      reply("Usage: /bot <command> \u2014 e.g. /bot next, /bot run 2, /bot ok, /bot tests.");
      reply("Goes over the hidden channel, so it works while you cannot speak.");
      reply("If /bot itself does nothing, another add-on has claimed the name \u2014 use /hypno bot <command>.");
      return;
    }
    const hypnotist = currentHypnotistId();
    const target = hypnotist ?? (others().length === 1 ? others()[0].MemberNumber : null);
    if (target == null) {
      reply(
        others().length ? `Not in a session, and more than one person is here: ${others().map((c) => `${c.Name} (${c.MemberNumber})`).join(", ")}.` : "Nobody else is in the room to send it to."
      );
      return;
    }
    sendHiddenMessage({ type: "test-command", text }, target);
    const name = findCharacter(target)?.Name ?? `#${target}`;
    reply(`Sent "${text}" to ${name} (${target})${hypnotist ? " \u2014 your hypnotist" : ""}.`);
    log(`/bot -> ${target}: ${text}`);
  }
  function installBotCommand() {
    CommandCombine({
      Tag: "bot",
      Description: "TESTING: send a command to the test bot (works while silenced)",
      Action: sendToBot
    });
  }
  function commandHelp() {
    return COMMANDS.map((c) => ({
      group: c.group,
      tag: c.Tag,
      args: c.args ?? "",
      description: c.Description
    }));
  }
  var COMMANDS = [
    // --- Session flow. These stay usable in any state; safeword especially must
    // never be conditional on anything (design doc's hard floor). ---
    {
      Tag: "agree",
      group: "Session",
      Description: "Accept a hypnosis attempt \u2014 cooperative, improves their roll",
      Action: () => answerPrompt("agree")
    },
    {
      Tag: "ignore",
      group: "Session",
      Description: "Neither help nor resist a hypnosis attempt",
      Action: () => answerPrompt("ignore")
    },
    {
      Tag: "fight",
      group: "Session",
      Description: "Resist a hypnosis attempt \u2014 lowers their roll",
      Action: () => answerPrompt("fight")
    },
    {
      Tag: "wake",
      group: "Session",
      Description: "Wake yourself, if the trance is shallow enough",
      Action: () => selfWake()
    },
    {
      Tag: "safeword",
      group: "Session",
      Description: "Hard stop: clears the trance and every effect. Always works.",
      Action: () => safeword()
    },
    {
      // The one to reach for after a reconnect, or any time the question is "why can I not
      // do that". `session` answers what PHASE you are in and what you have permitted;
      // this answers what is actually on you, which is a different question and was the
      // one with no command behind it.
      Tag: "effects",
      group: "Session",
      Description: "Show everything currently affecting you, and what would survive a reconnect",
      Action: () => {
        for (const line of describeCurrentState()) reply(line);
        const held = listTriggers().filter(isTriggerInEffect);
        reply(
          held.length ? `triggers holding you: ${held.map((t) => `"${t.actions.join(", ")}" (by ${t.installedByName})`).join("; ")}` : "no trigger is holding you"
        );
        reply(describeCarry());
        reply(describeSavedState());
        reply("Out of any of it: /hypno safeword.");
      }
    },
    {
      Tag: "session",
      group: "Session",
      Description: "Show your session state and which permissions are granted",
      Action: () => reply(describeSession())
    },
    {
      // Bypasses matching, permissions and the session entirely — calls BC's pose
      // API directly. If this works but saying "kneel" doesn't, the problem is in
      // our gating; if this fails too, it's the pose API itself.
      Tag: "kneel",
      group: "Diagnostics",
      Description: "Kneel directly, bypassing matching, permissions and session",
      Action: () => {
        setSuggestedPose("Kneel");
        reply(
          `pose set directly. ActivePose=${JSON.stringify(Player?.ActivePose)} PoseMapping.BodyLower=${Player?.PoseMapping?.BodyLower} IsKneeling=${Player?.IsKneeling?.()}`
        );
      }
    },
    {
      Tag: "stand",
      group: "Diagnostics",
      Description: "Stand directly, bypassing matching, permissions and session",
      Action: () => {
        setSuggestedPose(null);
        reply(
          `pose reset directly. ActivePose=${JSON.stringify(Player?.ActivePose)} PoseMapping.BodyLower=${Player?.PoseMapping?.BodyLower} IsKneeling=${Player?.IsKneeling?.()}`
        );
      }
    },
    {
      // Reports what the parser makes of a phrase without needing a live session,
      // so a line that "does nothing" can be pinned on matching vs. permissions.
      Tag: "match",
      group: "Diagnostics",
      args: "<phrase>",
      Description: "Report what a spoken phrase would trigger, and why not",
      Action: (args) => {
        if (!args.trim()) {
          reply("usage: /hypno match <phrase to test>");
          return;
        }
        reply(`"${args.trim()}" \u2192 ${describeMatch(args)}`);
      }
    },
    {
      // Jumps straight to a trust level without playing to it. Back-solves the
      // interaction count that produces the value, since counts are what's stored.
      Tag: "settrust",
      group: "Testing",
      args: "[name|number] <0-100>",
      Description: "Jump trust to a value without playing to it",
      Action: (args) => {
        const usage = "usage: /hypno settrust [name or member number] <0-100>";
        const parts = args.trim().split(/\s+/).filter(Boolean);
        const [token, rawValue] = parts.length >= 2 ? parts : ["", parts[0]];
        const value = Number(rawValue);
        if (!Number.isFinite(value)) {
          reply(usage);
          return;
        }
        const target = targetOrAsk(token, usage);
        if (!target) return;
        const entry = setTrustValue(target.id, target.name, value);
        reply(
          `trust with ${entry.memberName} \u2192 ${trustWith(target.id).toFixed(1)} (${entry.interactions.toFixed(1)} interactions)`
        );
      }
    },
    {
      // BC relationships need an actual owner or lover to test against, which is not
      // something you can arrange on demand. This pretends, per member number, so the
      // floors and the category rules can be exercised with one alt.
      Tag: "relate",
      group: "Testing",
      args: "[name|number] <none|friend|lover|owner|clear>",
      Description: "Pretend a BC relationship with someone, to test the trust floors",
      Action: (args) => {
        const usage = "usage: /hypno relate [name or member number] <none|friend|lover|owner|clear>";
        const parts = args.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) {
          const all = listRelationshipOverrides();
          reply(all.length ? "test overrides:" : "no relationship overrides set");
          all.forEach((o) => reply(`  ${findCharacter(o.memberId)?.Name ?? o.memberId} \u2192 ${o.kind}`));
          reply(usage);
          return;
        }
        const [token, rawKind] = parts.length >= 2 ? parts : ["", parts[0]];
        const kind = rawKind.toLowerCase();
        if (!["none", "friend", "lover", "owner", "clear"].includes(kind)) {
          reply(usage);
          return;
        }
        const target = targetOrAsk(token, usage);
        if (!target) return;
        setRelationshipOverride(target.id, kind === "clear" ? null : kind);
        reply(`${target.name}: ${describeRelationship(target.id)}`);
        reply(
          `  access \u2014 session ${accessFor(target.id, "session").toFixed(1)}, arousal ${accessFor(target.id, "arousal").toFixed(1)}, deceptive ${accessFor(target.id, "deceptive").toFixed(1)}, persistent ${accessFor(target.id, "persistent").toFixed(1)}`
        );
      }
    },
    {
      Tag: "decay",
      group: "Testing",
      args: "[never|veryslow|slow|typical|fast|veryfast]",
      Description: "Read or set how fast trust fades without contact",
      Action: (args) => {
        const token = firstWord(args).toLowerCase();
        if (!token) {
          reply(`trust decay: ${getDecayRate()} \u2014 ${DECAY_RATES.map((r) => r.key).join(", ")}`);
          return;
        }
        if (!DECAY_RATES.some((r) => r.key === token)) {
          reply(`usage: /hypno decay <${DECAY_RATES.map((r) => r.key).join("|")}>`);
          return;
        }
        setDecayRate(token);
        reply(`trust decay set to ${token}`);
      }
    },
    {
      Tag: "setexp",
      group: "Testing",
      args: "<0-100>",
      Description: "Jump subject experience to a value",
      Action: (args) => {
        const value = Number(firstWord(args));
        if (!Number.isFinite(value)) {
          reply("usage: /hypno setexp <0-100>");
          return;
        }
        reply(`experience \u2192 ${setExperienceValue(value).toFixed(1)}`);
      }
    },
    {
      Tag: "export",
      group: "Data",
      Description: "Print your settings as a blob you can copy and keep",
      Action: () => {
        reply("Copy the line below. /hypno import <blob> restores it.");
        reply(exportSettings());
      }
    },
    {
      Tag: "import",
      group: "Data",
      args: "<blob>",
      Description: "Replace all settings with a previously exported blob",
      Action: (args) => {
        if (settingsLocked()) {
          reply(IMPORT_LOCKED_MESSAGE);
          return;
        }
        const result = importSettings(args);
        reply(result.ok ? `Imported: ${result.message}` : `Import failed: ${result.message}`);
      }
    },
    {
      // Two-step on purpose: this throws away every stat and toggle, and a single
      // mistyped command shouldn't be able to do that.
      Tag: "reset",
      group: "Data",
      Description: "Wipe all settings and stats back to defaults (asks first)",
      Action: (args) => {
        if (firstWord(args).toLowerCase() !== "confirm") {
          if (isHypnotized()) {
            reply(
              "This erases all trust, experience and settings. You are also in a trance right now \u2014 resetting will end it and release everything first. Run: /hypno reset confirm"
            );
            reply("(If you only want out of the trance, /hypno safeword does that and keeps your settings.)");
            return;
          }
          reply("This erases all trust, experience and settings. Run: /hypno reset confirm");
          return;
        }
        reply(resetSettings());
      }
    },
    {
      // The dropdown on the Triggers tab does the same thing. This exists because a setting
      // you can only reach by opening a screen is a setting that cannot be scripted, and the
      // test bot drives everything else by command.
      Tag: "triggerdecay",
      group: "Data",
      args: "[rate]",
      Description: "How fast planted triggers fade without reinforcement (separate from trust decay)",
      Action: (args) => {
        const token = firstWord(args).toLowerCase();
        if (!token) {
          reply(`Triggers fade: ${DECAY_RATES.find((r) => r.key === getTriggerDecayRate())?.label ?? "Never"} \u2014 ${describeDecayPace()}.`);
          reply(`Options: ${DECAY_RATES.map((r) => r.key).join(", ")}.`);
          return;
        }
        const rate = DECAY_RATES.find((r) => r.key === token);
        if (!rate) {
          reply(`No such rate "${token}". Options: ${DECAY_RATES.map((r) => r.key).join(", ")}.`);
          return;
        }
        setTriggerDecayRate(rate.key);
        reply(`Planted triggers now fade: ${rate.label} \u2014 ${describeDecayPace(rate.key)}.`);
        reply(
          "Deeper plantings fade more slowly, and neglect compounds: the longer one goes unused the faster it sheds. Firing it slows that; only a re-induction resets it."
        );
      }
    },
    {
      Tag: "triggers",
      group: "Diagnostics",
      // `full` is advertised only where it works. A getter, not a fixed value, because testing
      // mode is now a runtime room check: read afresh each time the help is drawn, the hint
      // appears in the testing room and is gone outside it, so the screen never documents an
      // argument that would ignore you.
      get args() {
        return isTestingMode() ? "[full]" : "";
      },
      Description: "List the triggers planted in you, and which are currently holding you",
      Action: (args) => {
        const all = listTriggers();
        if (!all.length) {
          reply("no triggers planted");
          return;
        }
        describeTriggerList(isTestingMode() && firstWord(args).toLowerCase() === "full").forEach(reply);
        reply(
          "Remove one with /hypno forgettrigger <number>, or all of them with 'all' \u2014 but not while it is holding you. /hypno safeword is the way out of that."
        );
      }
    },
    {
      Tag: "forgettrigger",
      group: "Data",
      args: "<number|all>",
      Description: "Remove a planted trigger by its number from /hypno triggers, or all",
      Action: (args) => {
        const token = args.trim().toLowerCase();
        if (!token) {
          reply("usage: /hypno forgettrigger <number|all>  (see /hypno triggers)");
          return;
        }
        const all = listTriggers();
        if (token === "all") {
          const held = all.filter(isTriggerInEffect);
          const free = all.filter((t) => !isTriggerInEffect(t));
          free.forEach((t) => forgetTrigger(t.phrase));
          reply(
            held.length ? `forgot ${free.length} trigger(s). ${held.length} still holding you \u2014 /hypno safeword clears everything and always works.` : `forgot ${free.length} trigger(s)`
          );
          return;
        }
        const index = Number(token);
        if (!Number.isInteger(index) || index < 1 || index > all.length) {
          reply(`no trigger ${token} \u2014 you have ${all.length}. See /hypno triggers.`);
          return;
        }
        if (isTriggerInEffect(all[index - 1])) {
          reply(
            `Trigger ${index} is holding you right now, so it can't be deleted. Wait for it to wear off, have whoever set it release you, or use /hypno safeword \u2014 that always works, from any state.`
          );
          return;
        }
        const gone = forgetTrigger(all[index - 1].phrase);
        reply(gone ? `forgot trigger ${index}` : "nothing removed");
      }
    },
    {
      Tag: "storage",
      group: "Diagnostics",
      Description: "Where settings loaded from, and what each source holds",
      Action: () => describeStorage().forEach(reply)
    },
    {
      // Browser-console diagnostics, off by default so other mod developers' devtools stay
      // clear. Not a Testing command: a player may be asked to turn it on to send a report.
      Tag: "debug",
      group: "Diagnostics",
      args: "[on|off]",
      Description: "Switch the add-on's routine console lines on or off (this browser only)",
      Action: (args) => {
        const word = firstWord(args).toLowerCase();
        if (word && word !== "on" && word !== "off") {
          reply("usage: /hypno debug [on|off] \u2014 with nothing, it switches to the other setting.");
          return;
        }
        const on = word ? word === "on" : !isDebugFlagOn();
        const saved = setDebugFlag(on);
        reply(`Console debug lines are now ${on ? "ON" : "OFF"} for this browser.${saved ? "" : " (Couldn't save that \u2014 it lasts until you reload.)"}`);
        if (on) reply("They are filed under the console's Verbose (Chrome) or Debug (Firefox) level \u2014 switch that on to see them.");
        else if (isDebugLogging()) reply("They stay on while you're in the Hypno Testing room.");
      }
    },
    {
      // YOUR OWN number, never anyone else's — the only skill value a command will print, by
      // the same rule that keeps trust and experience to a sought-out screen (§5a). What the
      // far side then honours is their setting and is deliberately invisible to you.
      Tag: "skill",
      group: "Diagnostics",
      Description: "Show your own hypnotist skill, and how it is read",
      Action: () => {
        const v = skillValue();
        reply(`Your skill reads ${v.toFixed(1)}/100, from ${skillCount().toFixed(2)} of practice (every attempt counts, a success counts more).`);
        reply("It travels with each induction you attempt. How much of it lands is the other person's setting \u2014 you are never told.");
        reply(`Your own honour of others' skill is set to: ${SKILL_HONOUR_RUNGS.find((r) => r.key === getSkillHonour())?.label ?? "Only from people I trust"}.`);
      }
    },
    {
      Tag: "induce",
      group: "Session",
      args: "[name|number]",
      Description: "Attempt an induction on someone, the same as the remote's button",
      Action: (args) => {
        const target = targetOrAsk(firstWord(args), "usage: /hypno induce [name or member number]");
        if (!target) return;
        startInduction(target);
      }
    },
    {
      Tag: "retry",
      group: "Session",
      Description: "Try again on the last person you attempted",
      Action: () => {
        if (!lastInduced) {
          reply("You haven't attempted anyone yet this session \u2014 use /hypno induce [name].");
          return;
        }
        const still = others().some((c) => c?.MemberNumber === lastInduced.id);
        if (!still) {
          reply(`${lastInduced.name} isn't in the room any more.`);
          return;
        }
        startInduction(lastInduced);
      }
    },
    {
      Tag: "chance",
      group: "Diagnostics",
      args: "[name|number]",
      Description: "Show the induction chance for each choice against someone",
      Action: (args) => {
        const target = targetOrAsk(firstWord(args), "usage: /hypno chance [name or member number]");
        if (target) describeChances(target.id).forEach(reply);
      }
    },
    {
      Tag: "freeze",
      group: "Testing",
      Description: "Apply the Freeze effect to yourself",
      Action: () => reply(
        applyEffect("Freeze") ? "Freeze applied" : "Freeze failed \u2014 no Emoticon item found"
      )
    },
    {
      Tag: "unfreeze",
      group: "Testing",
      Description: "Remove the Freeze effect from yourself",
      Action: () => reply(
        removeEffect("Freeze") ? "Freeze removed" : "Freeze wasn't applied"
      )
    },
    {
      // Same job as /hypno kneel: exercise the arousal API with no matching, permission
      // or session in the way, so "saying it did nothing" can be pinned on the gates
      // rather than on BC's arousal system.
      Tag: "arousal",
      group: "Testing",
      args: "<none|light|high|full|orgasm|deny|allow>",
      Description: "Drive arousal directly, bypassing matching, permissions and session",
      Action: (args) => {
        const what = firstWord(args).toLowerCase();
        if (!arousalAvailable()) {
          reply(
            "arousal is switched off for this character \u2014 set Preferences > Arousal to something other than Inactive"
          );
          return;
        }
        if (what === "orgasm") {
          reply(`forced orgasm: ${forceOrgasm()}`);
          return;
        }
        if (what === "deny" || what === "allow") {
          setOrgasmDenied(what === "deny");
          reply(`orgasm denial ${what === "deny" ? "applied" : "released"} (DenialMode effect)`);
          return;
        }
        if (!(what in AROUSAL_LEVELS)) {
          reply(`usage: /hypno arousal ${Object.keys(AROUSAL_LEVELS).join("|")}|orgasm|deny|allow`);
          return;
        }
        setArousalLevel(what);
        reply(
          `arousal set to ${what} (${AROUSAL_LEVELS[what]}). Progress=${Player?.ArousalSettings?.Progress} Active=${Player?.ArousalSettings?.Active}`
        );
      }
    },
    {
      Tag: "carry",
      group: "Diagnostics",
      args: "[drop]",
      Description: "Show what is set to outlive the trance, or drop it",
      Action: (args) => {
        if (firstWord(args).toLowerCase() === "drop") {
          reply(releaseCarried("dropped by command") ? "carried suggestions released" : "nothing was carried");
          return;
        }
        reply(describeCarry());
      }
    },
    {
      // Bypasses matching, permissions, trust and session, like /hypno kneel. Also the
      // quickest way to confirm the draw hook is alive at all.
      Tag: "illusion",
      group: "Testing",
      args: "<on|off>",
      Description: "Freeze/release your own view of your clothes, bypassing all gates",
      Action: (args) => {
        const word = firstWord(args).toLowerCase();
        if (word === "on") freezeAppearance();
        else if (word === "off") clearIllusion();
        reply(describeIllusion());
      }
    },
    {
      Tag: "suppress",
      group: "Testing",
      Description: "Arm a one-shot swallow of the next incoming Action message",
      Action: () => {
        suppressNextAction = true;
        reply(
          "armed: next incoming Action-type message will be logged and suppressed"
        );
      }
    },
    {
      Tag: "wardrobeblock",
      group: "Testing",
      args: "<on|off>",
      Description: "Toggle the BlockWardrobe effect on yourself",
      Action: (args) => {
        const on = firstWord(args).toLowerCase() !== "off";
        const ok = on ? applyEffect("BlockWardrobe") : removeEffect("BlockWardrobe");
        reply(
          ok ? `wardrobe block ${on ? "ON" : "OFF"}` : "wardrobe block failed \u2014 no Emoticon item found"
        );
      }
    },
    {
      Tag: "ping",
      group: "Testing",
      args: "[name|number]",
      Description: "Send a hidden-message round trip to test the channel",
      Action: (args) => {
        const target = targetOrAsk(firstWord(args), "usage: /hypno ping [name or member number]");
        if (!target) return;
        sendHiddenMessage({ type: "ping", at: Date.now() }, target.id);
        reply(`sent ping to ${target.name} (${target.id})`);
      }
    },
    {
      Tag: "bumptrust",
      group: "Testing",
      args: "[name|number] <n>",
      Description: "Add n interactions (conversation is 1, an induction is 5)",
      Action: (args) => {
        const usage = "usage: /hypno bumptrust [name or member number] <interactions>";
        const parts = args.trim().split(/\s+/).filter(Boolean);
        const [token, rawDelta] = parts.length >= 2 ? parts : ["", parts[0]];
        const delta = Number(rawDelta ?? "1");
        if (!Number.isFinite(delta)) {
          reply(usage);
          return;
        }
        const target = targetOrAsk(token, usage);
        if (!target) return;
        const entry = addInteractions(target.id, target.name, delta);
        reply(
          `trust with ${entry.memberName} \u2192 ${trustWith(target.id).toFixed(1)} (${entry.interactions.toFixed(1)} interactions)`
        );
      }
    },
    {
      // The escape hatch that was missing. A junk entry could previously only be removed by
      // resetting everything, which also throws away every real relationship — so the cost
      // of one bad row was the whole dataset.
      //
      // Takes a raw member number as well as a name, deliberately: the row you most want to
      // delete is the one that should not exist, and such a row is often for somebody who is
      // not in the room to be named.
      Tag: "forgettrust",
      group: "Data",
      args: "<name|number>",
      Description: "Delete a stored trust entry outright \u2014 see /hypno logtrust for the numbers",
      Action: (args) => {
        const token = firstWord(args);
        if (!token) {
          reply("Usage: /hypno forgettrust <name|number>. /hypno logtrust lists them with their numbers.");
          return;
        }
        const byNumber = /^\d+$/.test(token) ? Number(token) : null;
        const entry = byNumber ? listTrustRaw().find((t) => t.memberId === byNumber) : listTrustRaw().find((t) => t.memberName?.toLowerCase() === token.toLowerCase());
        if (!entry) {
          reply(`No stored trust entry matches "${token}". /hypno logtrust shows what is stored.`);
          return;
        }
        forgetTrust(entry.memberId);
        reply(`Forgot ${entry.memberName} [${entry.memberId}] \u2014 ${entry.interactions.toFixed(1)} interactions gone.`);
      }
    },
    {
      // TESTING ONLY. Depth normally comes from the induction roll, which means every check
      // of a depth gate is at the mercy of chance — you cannot ask "does Deep unlock the
      // illusion" without rolling until you get a Deep. This sets it directly.
      //
      // Two numbers, because one would hide the thing most worth testing: `full earned`
      // lets the earned-only rule be exercised deliberately. `/hypno depth 80 20` is a
      // subject who is deep because they are aroused, and must still be refused a trigger.
      Tag: "depth",
      group: "Testing",
      args: "<0-100> [earned]",
      Description: "TESTING: force the current trance depth, and optionally the earned half",
      Action: (args) => {
        if (!isTestingMode()) {
          reply("Not available \u2014 join the Hypno Testing room to use this.");
          return;
        }
        const parts = (args ?? "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) {
          reply(`Depth now: ${currentDepth()} full / ${currentDepthEarned()} earned (${tierLabel(tierOf(currentDepth()))}).`);
          reply("Usage: /hypno depth <0-100> [earned]. Try `/hypno depth 80 20` for an aroused-but-unearned trance.");
          return;
        }
        const full = Math.max(0, Math.min(100, Number(parts[0]) || 0));
        const earned = parts.length > 1 ? Math.max(0, Math.min(100, Number(parts[1]) || 0)) : full;
        setCurrentDepths(full, earned);
        reply(
          `Depth forced to ${currentDepth()} full / ${currentDepthEarned()} earned \u2014 ${tierLabel(tierOf(currentDepth()))}. This does NOT start a session; it only sets the number gates read. For suggestions to land you also need a live session \u2014 see /hypno trance.`
        );
      }
    },
    {
      // The same thing `/bot` does, reachable through a tag nobody else can claim. Not a
      // duplicate so much as the one that is guaranteed to work: see installBotCommand.
      Tag: "bot",
      group: "Testing",
      args: "<command>",
      Description: "TESTING: send a command to the test bot \u2014 the collision-proof form of /bot",
      Action: sendToBot
    },
    {
      // TESTING ONLY, and the missing half of /hypno depth.
      //
      // Depth alone was never enough: handleSpokenLine() checks isSessionActiveWith(sender)
      // BEFORE it consults any depth gate, so a forced depth with no session refused every
      // suggestion and looked exactly like a broken feature. This starts a real session at
      // a chosen depth in one step, which is what the depth scenarios actually need.
      Tag: "trance",
      group: "Testing",
      args: "[who] [depth] [earned]",
      Description: "TESTING: go straight under with someone, at a chosen depth, skipping the roll",
      Action: (args) => {
        if (!isTestingMode()) {
          reply("Not available \u2014 join the Hypno Testing room to use this.");
          return;
        }
        const parts = (args ?? "").trim().split(/\s+/).filter(Boolean);
        const looksLikeDepth = parts.length && /^\d{1,3}$/.test(parts[0]) && Number(parts[0]) <= 100;
        const token = looksLikeDepth ? "" : parts.shift() ?? "";
        const target = targetOrAsk(token, "Usage: /hypno trance [who] [depth] [earned]");
        if (!target) return;
        const full = parts.length ? Math.max(0, Math.min(100, Number(parts[0]) || 0)) : 80;
        const earned = parts.length > 1 ? Math.max(0, Math.min(100, Number(parts[1]) || 0)) : full;
        const refused = forceTrance(target.id, full, earned);
        if (refused) {
          reply(`Can't: ${refused}.`);
          return;
        }
        reply(
          `Under with ${target.name} (${target.id}) at depth ${full} full / ${Math.min(full, earned)} earned \u2014 ${tierLabel(tierOf(currentDepth()))}. No roll, no trust awarded. /hypno wake to come out.`
        );
      }
    },
    {
      // TESTING ONLY, and the piece the decay scenario is blocked on.
      //
      // Trigger strength is derived from a clock, and every reading after the first one is
      // days away: even at *very fast* a Deep planting takes twelve hours to die. So the
      // scenario could watch a trigger start to fade and could not reach the compounding, the
      // firing credit, the ghost threshold or the sweep — four of its five expected results.
      // Turning the rate up further does not help, because a rate fast enough to sit through
      // is a rate too coarse to see the tier discount in.
      //
      // By NUMBER, not phrase — the same reasoning as /hypno forgettrigger. The phrase is
      // hidden from the subject unless they asked to see it, and a testing command must not
      // be the way round that.
      Tag: "agetrigger",
      group: "Testing",
      args: "[days] [number]",
      Description: "TESTING: wind a planted trigger's decay clock back, so fading can be watched",
      Action: (args) => {
        if (!isTestingMode()) {
          reply("Not available \u2014 join the Hypno Testing room to use this.");
          return;
        }
        const parts = (args ?? "").trim().split(/\s+/).filter(Boolean);
        const days = parts.length ? Number(parts[0]) : 1;
        if (!Number.isFinite(days)) {
          reply("Usage: /hypno agetrigger [days] [number] \u2014 see /hypno triggers for the numbering.");
          reply("Bare, it ages every planted trigger by one day. A number picks just that one.");
          reply("Relative, so `1` twice is two days. A negative number winds the clock forward again.");
          reply(`Triggers currently fade: ${describeDecayPace()}. /hypno triggerdecay changes that.`);
          return;
        }
        const index = parts.length > 1 ? Number(parts[1]) : void 0;
        if (index !== void 0 && !Number.isInteger(index)) {
          reply(`"${parts[1]}" is not a trigger number. /hypno triggers lists them by number.`);
          return;
        }
        const result = ageTriggers(days, index);
        if (result.refusal) {
          reply(`Can't: ${result.refusal}.`);
          return;
        }
        reply(`Aged ${result.aged} trigger(s) by ${days} day(s) \u2014 strength before and after:`);
        result.lines.forEach(reply);
        reply(
          "The firing credit is untouched \u2014 only the clock moved. One aged to nothing is swept on the next /hypno triggers, unless it is holding you."
        );
        reply(`Undo this exact move with /hypno agetrigger ${-days}${index !== void 0 ? ` ${index}` : ""}.`);
      }
    },
    {
      // The companion to the above, and the one to read when something will not fire: it
      // answers "what would work right now" in one screen rather than by trying things.
      Tag: "gates",
      group: "Diagnostics",
      Description: "Show every depth gate, what it needs, and whether you are deep enough now",
      Action: () => {
        const full = currentDepth();
        const earned = currentDepthEarned();
        reply(
          `Depth ${full} full / ${earned} earned \u2014 ${tierLabel(tierOf(full))}. Chemicals: ${arousalCounts() ? "arousal counts" : "arousal does NOT count"}.`
        );
        const features = getFeatures();
        for (const gate of DEPTH_GATES) {
          const granted = !!features[gate.key];
          const deep = depthAllows(gate.key, full, earned);
          const verdict = !granted ? "OFF (permission)" : deep ? "ready" : "too shallow";
          reply(
            `  ${verdict.padEnd(16)} ${gate.label} \u2014 needs ${tierLabel(requiredTier(gate.key))} (${requiredDepth(gate.key)})${gate.earnedOnly ? ", earned only" : ""}`
          );
        }
      }
    },
    {
      Tag: "logtrust",
      group: "Testing",
      Description: "List stored trust and experience, with the counts behind them",
      Action: () => describeTrust().forEach(reply)
    }
  ];

  // src/prompt.ts
  var PANEL_LEFT2 = 150;
  var PANEL_TOP3 = 250;
  var PANEL_WIDTH2 = 700;
  var PANEL_HEIGHT3 = 300;
  var BUTTON_TOP = 450;
  var BUTTON_WIDTH = 200;
  var BUTTON_HEIGHT = 70;
  var BUTTON_GAP = 25;
  var FIRST_BUTTON_LEFT = 175;
  var CHOICES = [
    { choice: "agree", label: "Agree", hover: "Let it happen. Much more likely to go under." },
    { choice: "ignore", label: "Ignore", hover: "Neither help nor resist. No bonus either way." },
    { choice: "fight", label: "Fight", hover: "Brace against it. Much more likely to stay clear." }
  ];
  function buttonLeft(index) {
    return FIRST_BUTTON_LEFT + index * (BUTTON_WIDTH + BUTTON_GAP);
  }
  function drawPrompt(hypnotistName, remainingMs, descriptor) {
    DrawRect(PANEL_LEFT2, PANEL_TOP3, PANEL_WIDTH2, PANEL_HEIGHT3, "White");
    DrawEmptyRect(PANEL_LEFT2, PANEL_TOP3, PANEL_WIDTH2, PANEL_HEIGHT3, "Black", 4);
    const centre = PANEL_LEFT2 + PANEL_WIDTH2 / 2;
    const inner = PANEL_WIDTH2 - 40;
    DrawTextFit(`${hypnotistName} is trying to hypnotize you.`, centre, PANEL_TOP3 + 55, inner, "Black");
    DrawTextFit("They are never told which you choose.", centre, PANEL_TOP3 + 105, inner, "Gray");
    if (descriptor) DrawTextFit(descriptor, centre, PANEL_TOP3 + 138, inner, "#444");
    DrawTextFit(
      `${Math.ceil(remainingMs / 1e3)}s \u2014 no answer counts as Ignore.`,
      centre,
      PANEL_TOP3 + 175,
      inner,
      "Gray"
    );
    CHOICES.forEach((c, i) => {
      DrawButton(buttonLeft(i), BUTTON_TOP, BUTTON_WIDTH, BUTTON_HEIGHT, c.label, "White", "", c.hover);
    });
  }
  function clickPrompt() {
    for (let i = 0; i < CHOICES.length; i++) {
      if (MouseIn(buttonLeft(i), BUTTON_TOP, BUTTON_WIDTH, BUTTON_HEIGHT)) {
        log(`prompt box answered: ${CHOICES[i].choice}`);
        answerPrompt(CHOICES[i].choice);
        return true;
      }
    }
    return MouseIn(PANEL_LEFT2, PANEL_TOP3, PANEL_WIDTH2, PANEL_HEIGHT3);
  }
  function installPrompt(modApi2) {
    modApi2.hookFunction(
      "ChatRoomRun",
      10,
      ((args, next) => {
        const result = next(args);
        const pending = getPendingPrompt();
        if (pending) drawPrompt(pending.hypnotistName, pending.remainingMs, pending.descriptor);
        return result;
      })
    );
    modApi2.hookFunction(
      "ChatRoomClick",
      10,
      ((args, next) => {
        if (getPendingPrompt() && clickPrompt()) return void 0;
        return next(args);
      })
    );
  }

  // src/remote.ts
  var ICON_LEFT = 90;
  var ICON_TOP = 130;
  var ICON_SIZE = 60;
  var ICON_INSET = 8;
  var SUB_EXIT_LEFT = 1815;
  var SUB_EXIT_TOP = 75;
  var SUB_EXIT_SIZE = 90;
  var SUB_HELP_LEFT = 1700;
  var FEATURE_BUTTON_LEFT = 400;
  var FEATURE_BUTTON_WIDTH = 500;
  var FEATURE_BUTTON_HEIGHT = 90;
  var SESSION_BUTTON_TOP = 290;
  var FIRST_FEATURE_TOP = 430;
  var FEATURE_SPACING = 115;
  var STATUS_LINE_Y = 245;
  var ABSENT_LINE_Y = 380;
  var RETRY_LEFT = 700;
  var RETRY_TOP = 470;
  var RETRY_WIDTH = 300;
  var RETRY_HEIGHT = 80;
  var activeTarget = null;
  var FEATURES = [
    {
      key: "movement",
      permission: "movementRestriction",
      applyLabel: "Apply Movement Restriction",
      releaseLabel: "Release Movement Restriction",
      isActive: (t) => !!t.HasEffect?.("Freeze"),
      apply: () => applyEffect("Freeze"),
      release: () => removeEffect("Freeze"),
      applyFlavor: "movement-block",
      releaseFlavor: "movement-release"
    },
    {
      key: "clothing",
      permission: "clothingRestriction",
      applyLabel: "Apply Clothing Restriction",
      releaseLabel: "Release Clothing Restriction",
      isActive: (t) => !!t.HasEffect?.("BlockWardrobe"),
      apply: () => applyEffect("BlockWardrobe"),
      release: () => removeEffect("BlockWardrobe"),
      applyFlavor: "clothing-block",
      releaseFlavor: "clothing-release"
    },
    {
      key: "posture",
      permission: "postureControl",
      applyLabel: "Kneel",
      releaseLabel: "Stand",
      // Not HasEffect — IsKneeling() reads PoseMapping.BodyLower, which is derived from
      // the synced ActivePose, so it's readable for anyone we can see.
      isActive: (t) => !!t.IsKneeling?.(),
      apply: () => setSuggestedPose("Kneel"),
      release: () => setSuggestedPose(null, "stance"),
      applyFlavor: "kneel",
      releaseFlavor: "stand"
    }
  ];
  function featureTop(index) {
    return FIRST_FEATURE_TOP + index * FEATURE_SPACING;
  }
  var knownState = /* @__PURE__ */ new Map();
  var PROBE_TIMEOUT_MS = 3e3;
  var probedAt = /* @__PURE__ */ new Map();
  function presenceOf(memberNumber) {
    if (knownState.has(memberNumber) || getSessionView(memberNumber)) return "present";
    const asked = probedAt.get(memberNumber);
    if (asked == null) return "waiting";
    return Date.now() - asked < PROBE_TIMEOUT_MS ? "waiting" : "absent";
  }
  function isPermitted(state, feature) {
    if (!state || !state.hypnoEnabled) return false;
    return !!state[feature.permission];
  }
  function getViewedOtherCharacter() {
    const C = InformationSheetSelection;
    if (!C || typeof C.IsPlayer === "function" && C.IsPlayer()) return null;
    return C;
  }
  function featureUnlocked(view, state, feature) {
    return view?.phase === "Hypnotized" && isPermitted(state, feature);
  }
  function drawFeatureButton(index, feature, target) {
    const state = knownState.get(target.MemberNumber);
    const view = getSessionView(target.MemberNumber);
    const unlocked = featureUnlocked(view, state, feature);
    const label = !state ? `${feature.applyLabel} (checking\u2026)` : feature.isActive(target) ? feature.releaseLabel : feature.applyLabel;
    const tooltip = !state ? "Waiting for their status" : view?.phase !== "Hypnotized" ? "Requires an active session" : isPermitted(state, feature) ? "" : "Not permitted";
    DrawButton(
      FEATURE_BUTTON_LEFT,
      featureTop(index),
      FEATURE_BUTTON_WIDTH,
      FEATURE_BUTTON_HEIGHT,
      label,
      unlocked ? "White" : "#ddd",
      "",
      tooltip,
      !unlocked
    );
  }
  function seconds(ms) {
    return Math.ceil(ms / 1e3);
  }
  function sessionButton(view) {
    if (!view) return { label: "Checking\u2026", enabled: false, tooltip: "Waiting for their status" };
    switch (view.phase) {
      case "AttemptMade":
        return { label: "Waiting for them\u2026", enabled: false, tooltip: "They're deciding how to respond" };
      case "InductionInProgress":
        return {
          label: `Induction\u2026 (${seconds(countdownRemaining(view, "windowRemaining"))}s)`,
          enabled: false,
          tooltip: "Roleplay the induction while this runs"
        };
      case "AttemptFailed":
        return {
          label: `Continue Trying (${view.attempts}/${view.maxAttempts})`,
          enabled: true,
          tooltip: "Try another induction"
        };
      case "Hypnotized":
        return { label: "Wake Up", enabled: true, tooltip: "End the session" };
      case "CooldownRequired": {
        const left = seconds(countdownRemaining(view, "cooldownRemaining"));
        if (left <= 0) return { label: "Attempt Hypnosis", enabled: true, tooltip: "Begin an induction" };
        return { label: `Cooldown (${left}s)`, enabled: false, tooltip: "They can't be attempted again yet" };
      }
      default:
        return { label: "Attempt Hypnosis", enabled: true, tooltip: "Begin an induction" };
    }
  }
  function statusLine(view) {
    if (!view) return "Checking their status\u2026";
    if (view.refusedReason) return view.refusedReason;
    switch (view.phase) {
      case "AttemptMade":
        return "They're deciding how to respond.";
      case "InductionInProgress":
        return "Induction underway \u2014 speak to them.";
      case "AttemptFailed":
        return `Not yet \u2014 they seem ${view.progressBand ?? "unchanged"}.`;
      case "Hypnotized":
        return `Under your influence \u2014 ${view.depthBand ?? "in trance"}.`;
      case "CooldownRequired":
        return "They've resisted enough for now.";
      default:
        return "Not in a session.";
    }
  }
  function drawSubscreen(target) {
    if (isHelpOpen()) {
      drawHelp("Erotic Chat Hypnosis Suite (ECHS) \u2014 help");
      return;
    }
    if (presenceOf(target.MemberNumber) === "absent") {
      drawAbsent(target);
      return;
    }
    const view = getSessionView(target.MemberNumber);
    DrawText(`Hypnosis Remote \u2014 ${target?.Name ?? "?"}`, MainCanvasWidth / 2, 170, "Black");
    DrawText(statusLine(view), MainCanvasWidth / 2, STATUS_LINE_Y, "Black");
    const session2 = sessionButton(view);
    DrawButton(
      FEATURE_BUTTON_LEFT,
      SESSION_BUTTON_TOP,
      FEATURE_BUTTON_WIDTH,
      FEATURE_BUTTON_HEIGHT,
      session2.label,
      session2.enabled ? "White" : "#ddd",
      "",
      session2.tooltip,
      !session2.enabled
    );
    FEATURES.forEach((feature, i) => drawFeatureButton(i, feature, target));
    DrawButton(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "", "White", "Icons/Exit.png", "Back");
    DrawButton(SUB_HELP_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "?", "White", "", "How this add-on works");
  }
  function drawAbsent(target) {
    const name = target?.Name ?? "They";
    DrawText(`Hypnosis Remote \u2014 ${name}`, MainCanvasWidth / 2, 170, "Black");
    DrawText(`${name} doesn't appear to be running ECHS.`, MainCanvasWidth / 2, ABSENT_LINE_Y, "Black");
    DrawText("Nothing on this panel would reach them.", MainCanvasWidth / 2, ABSENT_LINE_Y + 55, "Gray");
    DrawButton(RETRY_LEFT, RETRY_TOP, RETRY_WIDTH, RETRY_HEIGHT, "Check again", "White", "", "Ask them again");
    DrawButton(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "", "White", "Icons/Exit.png", "Back");
    DrawButton(SUB_HELP_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE, "?", "White", "", "How this add-on works");
  }
  function clickSessionButton(target) {
    if (!MouseIn(FEATURE_BUTTON_LEFT, SESSION_BUTTON_TOP, FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT)) return false;
    const view = getSessionView(target.MemberNumber);
    const { enabled } = sessionButton(view);
    if (!enabled) return true;
    if (view?.phase === "Hypnotized") requestWake(target.MemberNumber);
    else requestInduction(target.MemberNumber);
    return true;
  }
  function clickFeatureButton(index, feature, target) {
    if (!MouseIn(FEATURE_BUTTON_LEFT, featureTop(index), FEATURE_BUTTON_WIDTH, FEATURE_BUTTON_HEIGHT)) return false;
    const state = knownState.get(target.MemberNumber);
    if (!featureUnlocked(getSessionView(target.MemberNumber), state, feature)) {
      log(`${feature.key} locked for ${target.MemberNumber} (no session, or not permitted), ignoring click`);
      return true;
    }
    const active2 = feature.isActive(target);
    sendHiddenMessage({ type: "remote-request", feature: feature.key, enable: !active2 }, target.MemberNumber);
    log(`sent remote request (${feature.key}, enable=${!active2}) to ${target.MemberNumber}`);
    return true;
  }
  function clickSubscreen(target) {
    if (isHelpOpen()) {
      clickHelp();
      return;
    }
    if (MouseIn(SUB_HELP_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE)) {
      openHelp();
      return;
    }
    if (MouseIn(SUB_EXIT_LEFT, SUB_EXIT_TOP, SUB_EXIT_SIZE, SUB_EXIT_SIZE)) {
      activeTarget = null;
      return;
    }
    if (presenceOf(target.MemberNumber) === "absent") {
      if (MouseIn(RETRY_LEFT, RETRY_TOP, RETRY_WIDTH, RETRY_HEIGHT)) probeRemote(target);
      return;
    }
    if (clickSessionButton(target)) return;
    FEATURES.some((feature, i) => clickFeatureButton(i, feature, target));
  }
  function openRemoteFor(target) {
    activeTarget = target;
    probeRemote(target);
  }
  function probeRemote(target) {
    knownState.delete(target.MemberNumber);
    probedAt.set(target.MemberNumber, Date.now());
    sendHiddenMessage({ type: "state-query" }, target.MemberNumber);
    querySession(target.MemberNumber);
  }
  function installRemote(modApi2) {
    registerHiddenHandler("state-query", (sender) => {
      const features = getFeatures();
      sendHiddenMessage(
        {
          type: "state-response",
          hypnoEnabled: features.hypnoEnabled,
          movementRestriction: features.movementRestriction,
          clothingRestriction: features.clothingRestriction,
          postureControl: features.postureControl
        },
        sender
      );
    });
    registerHiddenHandler("state-response", (sender, message) => {
      knownState.set(sender, {
        hypnoEnabled: !!message.hypnoEnabled,
        movementRestriction: !!message.movementRestriction,
        clothingRestriction: !!message.clothingRestriction,
        postureControl: !!message.postureControl
      });
    });
    registerHiddenHandler("remote-request", (sender, message) => {
      const feature = FEATURES.find((f) => f.key === message.feature);
      if (!feature) return;
      const enable = !!message.enable;
      if (!enable) {
        feature.release();
        announce(feature.releaseFlavor);
        return;
      }
      const features = getFeatures();
      if (!features.hypnoEnabled) {
        log(`remote request (${feature.key}) from ${sender} denied \u2014 Hypnosis Enabled is off`);
        return;
      }
      if (!isPermitted(features, feature)) {
        log(`remote request (${feature.key}) from ${sender} denied \u2014 not permitted`);
        return;
      }
      if (!isSessionActiveWith(sender)) {
        log(`remote request (${feature.key}) from ${sender} denied \u2014 no active session with them`);
        return;
      }
      log(`remote request (${feature.key}) from ${sender} honored`);
      if (feature.apply() === false) {
        announce("pose-blocked");
        return;
      }
      announce(feature.applyFlavor);
    });
    modApi2.hookFunction(
      "InformationSheetRun",
      10,
      ((_args, next) => {
        if (activeTarget) {
          drawSubscreen(activeTarget);
          return;
        }
        next([]);
        const C = getViewedOtherCharacter();
        if (C) {
          DrawButton(ICON_LEFT, ICON_TOP, ICON_SIZE, ICON_SIZE, SPIRAL_ICON ? "" : "H", "White", "", "ECHS Hypnosis Remote");
          if (SPIRAL_ICON) {
            DrawImageResize(
              SPIRAL_ICON,
              ICON_LEFT + ICON_INSET,
              ICON_TOP + ICON_INSET,
              ICON_SIZE - 2 * ICON_INSET,
              ICON_SIZE - 2 * ICON_INSET
            );
          }
        }
      })
    );
    modApi2.hookFunction(
      "InformationSheetClick",
      10,
      ((_args, next) => {
        if (activeTarget) {
          clickSubscreen(activeTarget);
          return;
        }
        const C = getViewedOtherCharacter();
        if (C && MouseIn(ICON_LEFT, ICON_TOP, ICON_SIZE, ICON_SIZE)) {
          openRemoteFor(C);
          return;
        }
        next([]);
      })
    );
    modApi2.hookFunction(
      "InformationSheetExit",
      10,
      ((_args, next) => {
        if (activeTarget) {
          activeTarget = null;
          closeHelp();
          return;
        }
        next([]);
      })
    );
  }

  // src/denial.ts
  var DENIAL_HOLD = 99;
  var ORGASM_HAPPENING = 2;
  var ANNOUNCE_EVERY_MS = 6e4;
  var lastAnnounced = 0;
  function isPlayer(C) {
    return !!C && (C === Player || C.IsPlayer?.() === true);
  }
  function denialHolds(C) {
    return isPlayer(C) && getFeatures().hypnoEnabled && orgasmDeniedByUs();
  }
  function orgasmHappening(settings) {
    return settings.OrgasmStage === ORGASM_HAPPENING && typeof settings.OrgasmTimer === "number" && settings.OrgasmTimer > CurrentTime;
  }
  function cancelPendingOrgasm(settings) {
    if (!(typeof settings.OrgasmTimer === "number" && settings.OrgasmTimer > 0)) return false;
    settings.OrgasmTimer = 0;
    settings.OrgasmStage = 0;
    if (typeof ActivityOrgasmGameTimer === "number") ActivityOrgasmGameTimer = 0;
    return true;
  }
  function hold() {
    if (denialCarrierLost()) {
      const restored = applyEffect("DenialMode");
      warn(restored ? "orgasm denial was missing from the carrier; re-applied it" : "orgasm denial is missing from the carrier and could not be re-applied; still enforcing it here");
    }
    const settings = Player?.ArousalSettings;
    if (settings) {
      const cancelled = cancelPendingOrgasm(settings);
      settings.Progress = DENIAL_HOLD;
      if (cancelled) {
        if (typeof ActivityChatRoomArousalSync === "function") ActivityChatRoomArousalSync(Player);
        log("a queued orgasm was cancelled by denial");
      }
    }
    const now = Date.now();
    if (now - lastAnnounced >= ANNOUNCE_EVERY_MS) {
      lastAnnounced = now;
      announce("orgasm-held");
    }
    log(`orgasm held by denial, arousal kept at ${DENIAL_HOLD}`);
  }
  function installDenial(modApi2) {
    for (const name of ["ActivityOrgasmPrepare", "ActivityOrgasmStart"]) {
      modApi2.hookFunction(
        name,
        10,
        ((args, next) => {
          try {
            if (denialHolds(args[0])) {
              if (!orgasmHappening(Player.ArousalSettings ?? {})) hold();
              return void 0;
            }
          } catch (err) {
            warn("orgasm denial check failed:", err);
          }
          return next(args);
        })
      );
    }
    log("orgasm denial hooks installed on ActivityOrgasmPrepare and ActivityOrgasmStart");
  }

  // src/welcome.ts
  function maybeShowFirstRunNotice() {
    if (wasWelcomeShown()) return;
    if (!hasAnyPermissionGranted()) {
      tellPlayer("Erotic Chat Hypnosis Suite (ECHS) \u2014 nothing is switched on yet. Click the spiral to set up.");
      tellPlayer("Your reactions are visible to the room by default; Trance Defaults turns that off.");
    }
    markWelcomeShown();
  }
  var BANNER_POLL_MS = 1e3;
  var BANNER_GIVE_UP_MS = 10 * 6e4;
  var bannerShown = false;
  function showStartupBanner() {
    if (bannerShown) return;
    bannerShown = true;
    tellPlayer(`Erotic Chat Hypnosis Suite (ECHS) \xB7 v${"0.85.3"} \xB7 /hypno help`);
  }
  function startStartupBanner() {
    const startedAt = Date.now();
    const tick = () => {
      const known = typeof Player?.MemberNumber === "number" && Player.MemberNumber > 0;
      const ready = known && typeof ServerPlayerIsInChatRoom === "function" && ServerPlayerIsInChatRoom();
      if (ready) {
        clearInterval(poll);
        showStartupBanner();
        maybeShowFirstRunNotice();
        return;
      }
      if (Date.now() - startedAt > BANNER_GIVE_UP_MS) clearInterval(poll);
    };
    const poll = setInterval(tick, BANNER_POLL_MS);
    tick();
  }
  var LOADED_TOAST_HOLD_MS = 5e3;
  var LOADED_TOAST_FADE_MS = 1500;
  function showLoadedToast() {
    if (typeof document === "undefined" || !document.body) return;
    const el = document.createElement("div");
    el.textContent = `ECHS v${"0.85.3"} loaded`;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "4px",
      right: "4px",
      zIndex: "9999",
      padding: "2px 6px",
      background: "rgba(0,0,0,0.6)",
      color: "#fff",
      fontSize: "10px",
      fontFamily: "monospace",
      borderRadius: "3px",
      pointerEvents: "none",
      opacity: "1",
      transition: `opacity ${LOADED_TOAST_FADE_MS}ms ease`
    });
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), LOADED_TOAST_FADE_MS + 100);
    }, LOADED_TOAST_HOLD_MS);
  }

  // src/main.ts
  function safely(label, fn) {
    try {
      fn();
    } catch (err) {
      warn(`FAILED to set up ${label}:`, err);
    }
  }
  info(`script loaded (v${"0.85.3"})`);
  safely("loaded toast", showLoadedToast);
  safely("startup banner", startStartupBanner);
  var modApi = import_bondage_club_mod_sdk.default.registerMod(
    {
      name: "ECHS",
      fullName: "Erotic Chat Hypnosis Suite",
      version: "0.85.3",
      repository: "https://github.com/Dwfreegethub/HypnosisAddon"
    },
    // Dev builds get reloaded into the same page repeatedly; allow replacing a prior
    // registration under the same name rather than throwing on the second load.
    { allowReplace: true }
  );
  safely("ChatRoomMessage hook", () => {
    modApi.hookFunction(
      "ChatRoomMessage",
      10,
      ((args, next) => {
        const data = args[0];
        if (handleIncomingHidden(data)) {
          return next(args);
        }
        if (data?.Type === "Action" && consumeSuppressFlag()) {
          log("suppressed Action message:", JSON.stringify(data));
          return void 0;
        }
        log("ChatRoomMessage", data);
        const inCharacter = typeof data?.Content === "string" ? stripOOC(unstutter(data.Content)) : null;
        if ((data?.Type === "Chat" || data?.Type === "Whisper") && inCharacter) {
          try {
            if (isTriggerSetupLine(data.Sender, inCharacter)) {
              handleSpokenLine(data.Sender, inCharacter);
              log("hid trigger setup line from the subject");
              return void 0;
            }
          } catch (err) {
            warn("trigger-setup check failed:", err);
          }
        }
        const result = next(args);
        if ((data?.Type === "Chat" || data?.Type === "Whisper") && inCharacter) {
          try {
            handleSpokenLine(data.Sender, inCharacter);
          } catch (err) {
            warn("suggestion parsing failed:", err);
          }
          try {
            noteInductionLine(data.Sender, inCharacter);
          } catch (err) {
            warn("induction RP counting failed:", err);
          }
          try {
            const sender = ChatRoomCharacter?.find((c) => c?.MemberNumber === data.Sender);
            const directed = data.Type === "Whisper" || mentionsAnyName(inCharacter, playerOwnNames());
            noteConversation(data.Sender, sender?.Name ?? `#${data.Sender}`, directed);
          } catch (err) {
            warn("trust accrual failed:", err);
          }
        }
        return result;
      })
    );
  });
  setRoomVoice(() => getFeatures().roomSeesReactions);
  safely("effect allow-list", installEffectAllowList);
  safely("speech-block hook", () => {
    modApi.hookFunction(
      "ChatRoomSendChatMessage",
      10,
      ((args, next) => {
        if (!isSpeechBlocked()) return next(args);
        if (!getFeatures().blockOOC && stripOOC(args[0]) === null) return next(args);
        log("speech blocked:", args[0]);
        announce("speech-blocked-attempt");
        return false;
      })
    );
  });
  safely("wardrobe-block hook", () => {
    modApi.hookFunction(
      "ChatRoomOpenWardrobeScreen",
      10,
      ((args, next) => {
        if (Player?.CanChangeOwnClothes?.() === false && hasOwnEffect("BlockWardrobe")) {
          announce("clothing-blocked-attempt");
          return void 0;
        }
        return next(args);
      })
    );
  });
  safely("screen-fade hook", () => {
    modApi.hookFunction(
      "ChatRoomRun",
      9,
      ((args, next) => {
        const result = next(args);
        drawTranceVeil();
        return result;
      })
    );
  });
  safely("session state machine", installSession);
  safely("trigger status channel", installTriggers);
  safely("message suppression", installSuppression);
  safely("self-touch hook", () => installSelfTouch(modApi));
  safely("orgasm denial hooks", () => installDenial(modApi));
  safely("follow-leash hook", () => installFollow(modApi));
  safely("/hypno command registration", installCommands);
  safely("preference menu registration", installMenu);
  safely("remote (Information Sheet) registration", () => installRemote(modApi));
  safely("induction prompt box", () => installPrompt(modApi));
  safely("clothing illusion", () => installIllusion(modApi));
})();
