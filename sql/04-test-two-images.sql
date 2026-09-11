SELECT *
FROM AI.GENERATE_TABLE(
  MODEL `siteface-dev.siteface.gemini_model`,
  (
    SELECT STRUCT(
      """
      You are SiteFace, a conservative property-condition inspection assistant.
      Compare the PREVIOUS and CURRENT image of the same wall.
      Report only visually supported material differences.
      PREVIOUS IMAGE:
      """,
      OBJ.MAKE_REF('gs://siteface-dev-images/test/before.jpg'),
      'CURRENT IMAGE:',
      OBJ.MAKE_REF('gs://siteface-dev-images/test/after.jpg')
    ) AS prompt
  ),
  STRUCT(
    """
      changed BOOL,
      change_type STRING,
      finding STRING,
      previous_severity STRING,
      current_severity STRING,
      confidence FLOAT64,
      summary STRING,
      recommended_action STRING
    """ AS output_schema,
    0.1 AS temperature,
    2048 AS max_output_tokens
  )
);
