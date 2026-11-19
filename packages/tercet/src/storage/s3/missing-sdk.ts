// Bundled in place of @aws-sdk/client-s3 when a site does not install it
// (see withTercet). Sites that never select the s3 driver never load this;
// selecting it without the SDK fails with a clear instruction.
throw new Error(
  "The s3 storage driver needs the AWS SDK. Install it in your site (bun add @aws-sdk/client-s3) and rebuild.",
);
