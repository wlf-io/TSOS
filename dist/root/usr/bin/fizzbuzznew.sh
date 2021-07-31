#!/bin/shell

func fizzbuzz num;

    set out $num;

    ifnot $num % 3;
        set out "$out fizz";
    endif;

    ifnot $num % 5;
        set out "$out buzz";
    endif;

    echo $out;

endfunc;

set count 1;

while $count <= 100;

    fizzbuzz $count;

    sum count 1;

endwhile;
