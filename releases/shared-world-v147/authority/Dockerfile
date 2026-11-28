FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" HOST=0.0.0.0 REDLINE_REQUIRE_AUTH=1 REDLINE_COLLISION_STRICT=1 REDLINE_MAX_ROOMS=2
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Preserve exact previous authority implementation; share collision caches across both revisions.
RUN cp flight.cjs flight150.cjs && sed "s@require('./flight.cjs')@require('./flight150.cjs')@" world.cjs > world150.cjs
# Materialize the verified uploaded v155 text source, not a hand-reconstructed version.
RUN base64 -d release155.payload.b64 > /tmp/release155.zip && echo "e5eca827d541196eda2ffdbfa306d7926dd4f0cb85f7522d155e9a79ef058bb4  /tmp/release155.zip" | sha256sum -c - && python3 -m zipfile -e /tmp/release155.zip /app && rm /tmp/release155.zip
RUN base64 -d release156.payload.b64 > /tmp/release156.zip && echo "78fe2a0cb9054b8f68201800d43579e6c32f872b2ae988b9544a8e62cfe0e711  /tmp/release156.zip" | sha256sum -c - && python3 -m zipfile -e /tmp/release156.zip /app && rm /tmp/release156.zip
RUN node test_environment156.cjs && REDLINE_REQUIRE_AUTH=0 python test_gateway156.py
RUN node test_collision.cjs && node test_frost.cjs && node test_course153.cjs && node test_formats155.cjs
RUN REDLINE_REQUIRE_AUTH=0 python test_gateway155.py && REDLINE_REQUIRE_AUTH=0 python test_dual155.py
RUN node test_botroom155.cjs
EXPOSE 8787
CMD ["python3","server.py"]
