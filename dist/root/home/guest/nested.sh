#!/bin/shell

func test1 arga;

    echo $arga;

    test2 $arga;

    echo $arga;

endfunc;


func test2 arga;

    echo $arga;

    set arga override;

    echo $arga;

endfunc;


test1 test;
