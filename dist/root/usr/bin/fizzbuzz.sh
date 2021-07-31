#!/bin/shell

func fizzbuzz num;

    echo -e $num;

    ifnot $num % 3;
        echo -e " fizz";
    endif;

    ifnot $num % 5;
        echo -e " buzz";
    endif;

    echo "";

endfunc;

set count 1;

while $count <= 100;

    fizzbuzz $count;

    sum count 1;

endwhile;
