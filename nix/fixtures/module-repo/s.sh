
if [ -f ".cargo/config.toml" ] && grep -q ${vendoredDir} ".cargo/config.toml"; then
  echo "yes"
else
  echo "no"
fi
