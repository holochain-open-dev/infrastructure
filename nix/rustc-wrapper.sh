#!/bin/bash
set -e

# file="/build/source/zome/src/lib.rs"
# for arg in "$@"; do
#     if [[ ${arg} == ${CARGO_HOME}/* && -z ${file} ]]; then
#         file=${arg##${CARGO_HOME}}
#     fi
# done
# echo "heyy"
# echo $file
# args=()
arglist="$@"
# for i in "${!arglist[@]}"; do
#     echo ${arglist[$i]}
#     if [[ ${arglist[$i]} != metadata=* ]]; then
#         # args+=(metadata="${file}")
#     # else
#         if [[ ${arglist[$i + 1]} != metadata=* ]]; then
#             # args+=(metadata="${file}")
#         # else
#             args+=("${arglist[$i]}")
#         fi
#     fi
# done

args=$(echo $@ | sed 's/-C metadata=[^\ ]* / /g')

exec $args
