{ lib }:

let
  parse = let
    l = lib // builtins;

    parse = text:
      let
        textWithoutFirstLine = l.strings.removePrefix ''
          ---
        '' text;

        lines = l.splitString "\n" textWithoutFirstLine;

        filtered = l.filter (line:
          (l.match "[[:space:]]*" line == null) && (!l.hasPrefix "#" line))
          lines;

        matched = l.map (line: matchLine line) filtered;

        /* Remove leading and trailing whitespace from a string.
           Whitespace is defined as any of the following characters:
             " ", "\t" "\r" "\n"
           Type: trim :: string -> string
           Example:
             trim "   hello, world!   "
             => "hello, world!"
        */
        trim = trimWith {
          start = true;
          end = true;
        };

        /* Remove leading and/or trailing whitespace from a string.
           Whitespace is defined as any of the following characters:
             " ", "\t" "\r" "\n"
           Type: trimWith :: Attrs -> string -> string
           Example:
             trimWith { start = true; } "   hello, world!   "}
             => "hello, world!   "
             trimWith { end = true; } "   hello, world!   "}
             => "   hello, world!"
        */
        trimWith = {
          # Trim leading whitespace
          start ? false,
          # Trim trailing whitespace
          end ? false, }:
          s:
          let
            # Define our own whitespace character class instead of using
            # `[:space:]`, which is not well-defined.
            chars = " 	\r\n";

            # To match up until trailing whitespace, we need to capture a
            # group that ends with a non-whitespace character.
            regex = if start && end then
              "[${chars}]*(.*[^${chars}])[${chars}]*"
            else if start then
              "[${chars}]*(.*)"
            else if end then
              "(.*[^${chars}])[${chars}]*"
            else
              "(.*)";

            # If the string was empty or entirely whitespace,
            # then the regex may not match and `res` will be `null`.
            res = builtins.match regex s;
          in lib.strings.optionalString (res != null) (builtins.head res);

        # Match each line to get: indent, key, value.
        # If a key value expression spans multiple lines,
        # the value of the current line will be defined null
        matchLine = line:
          let
            # single line key value statement
            m1 = l.match "([ -]*)(.*): (.*)" line;
            # multi line key value (line contains only key)
            m2 = l.match "([ -]*)(.*):$" line;
            # is the line starting a new list element?
            m3 = l.match "([[:space:]]*-[[:space:]]+)(.*)" line;
            # m3Key =  l.match ''(.*): (.*)'' line;
            isListEntry = m3 != null;
            toValue = value:
              let trimmedValue = trim value;
              in if trimmedValue == "[]" then
                [ ]
              else if trimmedValue == "~" then
                null
              else
                (let
                  m4 = l.match ''"(.*)"'' trimmedValue;
                  m5 = l.match "'(.*)'" trimmedValue;
                in if m4 != null then
                  l.elemAt m4 0
                else if m5 != null then
                  l.elemAt m5 0
                else if l.match "[0-9]+" trimmedValue != null then
                  lib.toInt trimmedValue
                else if l.match "^[ 	]*$" value != null then
                  null
                else if trimmedValue == "true" then
                  true
                else if trimmedValue == "false" then
                  false
                else if trimmedValue == "null" then
                  null
                else
                  trimmedValue);
          in if m3 != null then {
            inherit isListEntry;
            indent = (l.stringLength (l.elemAt m3 0)) / 2;
            key = if m1 != null then l.elemAt m1 1 else null;
            value = if m1 != null then
              toValue (l.elemAt m1 2)
            else
              toValue (l.elemAt m3 1);
          } else if m1 != null then {
            inherit isListEntry;
            indent = (l.stringLength (l.elemAt m1 0)) / 2;
            key = l.elemAt m1 1;
            value = toValue (l.elemAt m1 2);
          } else if m2 != null then {
            inherit isListEntry;
            indent = (l.stringLength (l.elemAt m2 0)) / 2;
            key = l.elemAt m2 1;
            value = null;
          } else
            null;

        numLines = l.length filtered;

        # convert yaml lines to json lines
        make = lines: i:
          let
            mNext = l.elemAt matched (i + 1);
            m = l.elemAt matched i;
            currIndent = if i == -1 then -1 else m.indent;
            next = make lines (i + 1);
            childrenMustBeList = mNext.indent > currIndent && mNext.isListEntry;

            findChildIdxs = searchIdx:
              let mSearch = l.elemAt matched searchIdx;
              in if searchIdx >= numLines then
                [ ]
              else if mSearch.indent > childIndent then
                findChildIdxs (searchIdx + 1)
              else if mSearch.indent == childIndent then
                if mSearch.isListEntry == childrenMustBeList then
                  [ searchIdx ] ++ findChildIdxs (searchIdx + 1)
                else
                  findChildIdxs (searchIdx + 1)
              else
                [ ];

            childIndent =
              if mNext.indent > currIndent then mNext.indent else null;

            childIdxs =
              if childIndent == null then [ ] else findChildIdxs (i + 1);

            childObjects = l.map (sIdx: make lines sIdx) childIdxs;

            childrenMerged = l.foldl (all: cObj:
              (if l.isAttrs cObj then
                (if all == null then { } else all) // cObj
              else
                (if all == null then [ ] else all) ++ cObj)) null childObjects;

            result = if i == (-1) then
              childrenMerged
            else if m.isListEntry then
              let
                listObjectFields = currentObj: i:
                  if i + 1 >= (builtins.length lines) then
                    currentObj
                  else
                    let
                      mNext = l.elemAt matched (i + 1);
                      listEnds = m.indent > mNext.indent || mNext.isListEntry;
                    in if listEnds then
                      currentObj
                    else
                      (if m.indent == mNext.indent then
                        listObjectFields (currentObj // (make lines (i + 1)))
                        (i + 1)
                      else
                        listObjectFields currentObj (i + 1));
                # has key and value -> check if attr continue
              in if m.key != null && m.value != null then
                [
                  (listObjectFields ({ "${m.key}" = m.value; }) i)
                ]
                # attrs element follows
                # if m.indent == mNext.indent && ! mNext.isListEntry
                # then [({"${m.key}" = m.value;} // next)]
                # list or unindent follows
                # else [{"${m.key}" = m.value;}]
                # list begin with only a key (child list/attrs follow)
              else if m.key != null then
                [
                  (listObjectFields ({ "${m.key}" = childrenMerged; }) i)
                ]
                # value only (list elem with plain value)
              else
                [
                  m.value
                ]
                # not a list entry
            else
            # has key and value
            if m.key != null
            && (m.value != null || i + 1 == (builtins.length lines)) then {
              "${m.key}" = m.value;
            }
            # key only
            else {
              "${m.key}" = childrenMerged;
            };

          in result;

      in make filtered (-1);
  in parse;

in file: (parse (builtins.readFile file))
