#!/bin/bash

REV=c6e501eceae06f381c80ed50ea7bb971f8d1edcc
LAIR_REV=a01a40640574d3cfabae33dfe3f861de7bd7a57c

cargo install --force holochain \
  --git https://github.com/holochain/holochain.git \
  --rev $REV
cargo install holochain_cli --force --bin hc \
  --git https://github.com/holochain/holochain.git \
  --rev $REV
cargo install --force lair_keystore \
      --git https://github.com/holochain/lair.git \
      --rev $LAIR_REV
