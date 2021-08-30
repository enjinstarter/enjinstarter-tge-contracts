FROM node:lts-buster
ARG SLITHER_VERSION=0.8.1
ARG SOLC_VERSION=0.7.6

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends python3-dev python3-pip python3-setuptools python3-wheel \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/home/vscode/.local/bin:${PATH}"

RUN groupadd vscode && useradd -m -g vscode vscode
USER vscode

# Set the default solc version: https://github.com/crytic/solc-select#usage
ENV SOLC_VERSION="${SOLC_VERSION}"

# Install solc (required by Slither)
# https://docs.soliditylang.org/en/latest/installing-solidity.html#linux-packages
# https://github.com/crytic/solc-select
RUN pip3 install solc-select \
    && solc-select install "${SOLC_VERSION}" \
    && solc --version

# Install Slither: https://github.com/crytic/slither#how-to-install
RUN pip3 install slither-analyzer=="${SLITHER_VERSION}" \
    && slither --version
