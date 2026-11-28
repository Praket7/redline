FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" HOST=0.0.0.0 REDLINE_REQUIRE_AUTH=1 REDLINE_COLLISION_STRICT=1 REDLINE_MAX_ROOMS=2
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN cp flight.cjs flight150.cjs && sed "s|require('./flight.cjs')|require('./flight150.cjs')|" world.cjs > world150.cjs
RUN cat stage155/part*.b64 | base64 -d > /tmp/stage155.zip && echo 'a463b18bf5f0e60c0765618df49d1630507dac8b8f8c98ae115b6991a25ae881  /tmp/stage155.zip' | sha256sum -c - && python -m zipfile -e /tmp/stage155.zip /app && python -c 'import json,hashlib,pathlib; m=json.load(open("release155-checksums.json")); assert all(hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h for p,h in m.items()); print("Verified",len(m),"authority source and collider hashes")' && rm /tmp/stage155.zip
RUN node test_collision.cjs && node test_frost.cjs && node test_world.cjs && node test_course153.cjs && node test_formats155.cjs && node test_rivals154.cjs
RUN REDLINE_REQUIRE_AUTH=0 python test_gateway155.py && REDLINE_REQUIRE_AUTH=0 python test_dual155.py
EXPOSE 8787
CMD ["python3","server.py"]
