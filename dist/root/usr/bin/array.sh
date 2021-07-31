#!/bin/shell


func listdir dir;

    set list ${ls -c $dir};

    set len ${count $list};

    set i 0;

    set sep "/";

    if $dir == "/";
        set sep "";
    endif;

    while $i < $len;

        fromindex item $list $i;

        set item "{$dir}{$sep}{$item}";

        echo $item;

        if $item is dir;
            listdir "$item";
        endif;

        sum i 1;

    endwhile;

endfunc;

listdir $0;
