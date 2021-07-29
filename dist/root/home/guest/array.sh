#!/bin/shell


func listdir dir;

    set list ${ls -c $dir};

    set len ${count $list};

    set i 0;

    while $i < $len;

        fromindex item $list $i;

        if $dir == "/";
            set item "/$item";
        else;
            set item "$dir/$item";
        endif;

        echo $item;

        if $item is dir;
            listdir "$item";
        endif;

        sum i 1;

    endwhile;

endfunc;

listdir $0;
