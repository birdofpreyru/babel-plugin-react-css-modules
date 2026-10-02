type ArgT = {
  local: string;
  module: {
    resource: string;
  };
};

export function localIdentNameFactory(
  localIdentName: string,
): (arg: ArgT) => string;

