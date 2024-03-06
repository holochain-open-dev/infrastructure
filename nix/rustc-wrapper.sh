#!/bin/bash
set -e

file="/build/source/zome/src/lib.rs"
# for arg in "$@"; do
#     if [[ ${arg} == ${CARGO_HOME}/* && -z ${file} ]]; then
#         file=${arg##${CARGO_HOME}}
#     fi
# done
# echo "heyy"
# echo $file
args=()
for arg in "$@"; do
    if [[ ${arg} == metadata=* ]]; then
        args+=(metadata="${file}")
    else
        args+=("${arg}")
    fi
done

exec "${args[@]}"
