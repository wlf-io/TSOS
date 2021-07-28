#!/bin/shell

set loop 0;

:start;

sum loop 1;

echo round $loop;

sleep 1;

if $loop < 10;

goto start;

endif;
