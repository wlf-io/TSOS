#!/bin/shell

func fizzbuzz num;

    echo -e $num;

    set three $num;
    mod three 3;

    if $three == 0;
        echo -e " fizz";
    endif;

    set five $num;
    mod five 5;

    if $five == 0;
        echo -e " buzz";
    endif;

    echo "";

endfunc;

set count 1;

while $count <= 100;

    fizzbuzz $count;

    sum count 1;

endwhile;
