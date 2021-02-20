@echo off
set VER=1.0.1

sed -i -E "s/version>.+?</version>%VER%</" install.rdf
sed -i -E "s/version>.+?</version>%VER%</; s/download\/.+?\/migration-agent-.+?\.xpi/download\/%VER%\/migration-agent-%VER%\.xpi/" update.xml

set XPI=migration-agent-%VER%.xpi
if exist %XPI% del %XPI%
zip -r9q %XPI% * -x .git/* .gitignore update.xml LICENSE README.md *.cmd *.xpi *.exe
