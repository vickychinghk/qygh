declare module "heic-convert" {
  type ConvertOptions = {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  };

  type ConvertAllResult = {
    convert: () => Promise<ArrayBuffer | Buffer>;
  };

  function convert(options: ConvertOptions): Promise<ArrayBuffer | Buffer>;

  namespace convert {
    function all(options: ConvertOptions): Promise<ConvertAllResult[]>;
  }

  export = convert;
}
