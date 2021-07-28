#!/bin/shell

mkdir test-rm;
mkdir test-rm/b;
mkdir test-rm/c;

touch test-rm/a;

mkdir test-rm/c/1;
mkdir test-rm/c/2;
touch test-rm/c/x;

rm -rf test-rm;
