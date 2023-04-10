// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { deserialize, serialize } from "./pkg/move_binary_format.js";

//
//
class CompiledModule {
  constructor(compiledModule) {
    this.inner = compiledModule;
  }

  changeIdentifiers(identMap) {
    // first apply patches - they don't affect indexes; but we need to keep
    // them to compare agains the new sorting order later.
    let identifiers = Object.freeze([...this.inner.identifiers].map((ident) =>
      ident in identMap ? identMap[ident] : ident
    ));

    // sort the identifiers - indexes are changed.
    this.inner.identifiers = [...identifiers].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));

    // console.log(this.inner.identifiers, identifiers);

    let indexUpdates = new Map();
    for (let ident of identifiers) {
      let oldIdx = identifiers.indexOf(ident);
      let newIdx = this.inner.identifiers.indexOf(ident);
      indexUpdates.set(oldIdx, newIdx);
    }

    const keys = ['module_handles', 'struct_handles', 'function_handles', 'field_handles'];

    // update each of the storages with the new index.
    for (let innerKey of keys) {
      this.inner[innerKey] = this.inner[innerKey].map((handle) => {
        return indexUpdates.has(handle.name)
          ? { ...handle, name: indexUpdates.get(handle.name) }
          : handle;
      });
    }

    // separately patch struct defs
    this.inner.struct_defs = this.inner.struct_defs.map((struct) => {
      let decl = struct.field_information.Declared.map((decl) => ({
        ...decl, name: indexUpdates.get(decl.name)
      }));

      return {
        ...struct,
        field_information: { Declared: decl }
      };
    });

    return this;
  }

  toJSON() {
    return this.inner;
  }
}

(async () => {
  let val = deserialize(templateBytes());
  let compiled = new CompiledModule(JSON.parse(val));

  compiled.changeIdentifiers({
    "ARTYBARA": "ARTYBARA",
    "artybara": "artybara",
    "Artybara": "Artybara",
  });

  let ser = serialize(JSON.stringify(compiled.toJSON()));
  let deser = deserialize(ser);

  console.log(ser);
  console.log(deser);
})();

function templateBytes() {
  return "a11ceb0b0600000009010008020812031a12042c0405302107516d08be0180010abe020a0cc80214000403060109020b000002000001040002020701000003030200000800010001050601020204020a030401000202010502080007080300010e010900010b0201090002080008010309000b02010e070803084152545942415241084172747962617261064f7074696f6e095478436f6e746578740861727479626172610c636c61696d5f7469636b65740b636f6c6c65637469626c650b64756d6d795f6669656c6404696e6974066f7074696f6e04736f6d650a74785f636f6e74657874000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002d35f7bf9525b4c4aa676d3c32ef53ec8ace095052e51e3db24462e0390d27383000201070101020107010000000001060b00490a00000038000b0138010200";
}

/*
type CompiledModule {
 'version',
  'self_module_handle_idx',
  'module_handles',
  'struct_handles',
  'function_handles',
  'field_handles',
  'friend_decls',
  'struct_def_instantiations',
  'function_instantiations',
  'field_instantiations',
  'signatures',
  'identifiers',
  'address_identifiers',
  'constant_pool',
  'metadata',
  'struct_defs',
  'function_defs'
}
*/
