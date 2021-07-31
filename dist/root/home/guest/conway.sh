#!/bin/shell

func conway;
    perfstart conway;
    set rows ${count $grid};
    set r 0;
    set nextgrid $grid;
    while $r < $rows;
        set cols ${count ${fromindex $grid $r}};
        set c 0;
        set row "[0,0,0,0,0,0,0,0,0,0]";
        while $c < $cols;

            conwaycell $r $c next;

            setindex row $row $c $next;

            sum c 1;
        endwhile;

        setindex nextgrid $nextgrid $r $row;

        sum r 1;
    endwhile;
    perfend conway;
    return $nextgrid;
endfunc;

func conwaycell r c;
    perfstart conwaycell;
    get_surround $r $c surround;
    get_cell $r $c alive;

    set next $alive;

    if $alive > 0;
        if $surround > 3;
            set next 0;
        endif;
        if $surround < 2;
            set next 0;
        endif;
    endif;
    if $alive < 1;
        if $surround == 3;
            set next 1;
        endif;
    endif;
    perfend conwaycell;

    return $next;

    # fromindex row $grid $r;

    # setindex row $row $c $next;

    # setindex nextgrid $nextgrid $r $row;
    
endfunc;

func get_surround r c;
    perfstart surround;
    set ro -1;
    set sum 0;
    while $ro < 2;
        set co -1;
        set rr $r;
        sum rr $ro;
        perfstart surround_col;
        # perfstart while_co;
        while $co < 2;
            # perfend while_co;
            # perfstart set_cc;
            set cc $c;
            sum cc $co;
            # perfend set_cc;
            # perfstart get_cell;
            get_cell $rr $cc val;
            # perfend get_cell;
            # perfstart centre_skip;
            if $ro == 0;
                if $co == 0;
                    set val 0;
                endif;
            endif;
            # perfend centre_skip;
            # perfstart set_val;
            sum sum $val;
            sum co 1;
            # perfend set_val;
            # perfstart while_co;
        endwhile;
        # perfend while_co;
        perfend surround_col;
        sum ro 1;
    endwhile;
    perfend surround;
    return $sum;
endfunc;

func get_cell r c;
    return ${fromindex ${fromindex $grid $r} $c};
endfunc;

func output grid;
    perfstart output;
    set rows ${count $grid};
    set r 0;
    set txt "";
    while $r < $rows;
        # log r;
        fromindex row $grid $r;
        # log $row;
        set cols ${count $row};
        set c 0;
        while $c < $cols;
            fromindex cell $row $c;
            set t "░░";
            if $cell == 1;
                set t "▓▓";
            endif;
            set txt "{$txt}$t";

            sum c 1;
        endwhile;
        
        set txt "$txt\n";

        sum r 1;
    endwhile;
    perfend output;
    # clear;
    echo "\033[j$run\n$txt";

endfunc;


set grid '[
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,0,0,0,0,0,0],
    [0,0,0,0,1,0,0,0,0,0],
    [0,0,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0]
]';


#echo ${count $grid};

#echo "Grid 1: ${fromindex $grid 1}";

# fromindex row $grid 1;

# echo "Row: $row";

# setindex row $row 1 2;

# echo "Row: $row";

# setindex grid $grid 1 $row;

# echo "Grid 1: ${fromindex $grid 1}";


set run 0;

while $run < 10;
    output $grid;
    conway grid;
    sum run 1;
endwhile;
