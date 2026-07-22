# Verifier adequacy audit

This verifier is frozen before the public copy and release-link work. It checks
the app repository's actual public source files rather than grading a proposed
diff, and the full corpus runs it alongside the product verifiers.

Lazy artifacts that must fail:

1. A README can mention the canonical repository while its download button
   still lands on the Pages repository; the verifier requires the stable APK
   URL in both README and homepage and rejects the stale Pages URL.
2. A homepage can contain the flagship words in a hidden footer while the
   hero still sells generic chat; the verifier requires the complete promise
   in the homepage's public HTML and a concrete calendar outcome.
3. The source docs can be corrected while the release workflow still publishes
   an artifact with no stable name; the verifier checks the workflow's actual
   `dist/marmot.apk` artifact as well as the public download URL.

Final acceptance also requires the separate Pages checkout to be synchronized
with `docs/index.html`, the GitHub repository homepage to point at the live
site, and a live latest-release URL check after publishing.
