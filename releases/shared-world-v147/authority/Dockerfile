FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" HOST=0.0.0.0 REDLINE_REQUIRE_AUTH=1 REDLINE_COLLISION_STRICT=1 REDLINE_MAX_ROOMS=2
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN REDLINE_COLLISION_STRICT=1 node test_collision.cjs
RUN REDLINE_REQUIRE_AUTH=0 REDLINE_COLLISION_STRICT=1 python -m py_compile server.py test_gateway_hardening.py && REDLINE_REQUIRE_AUTH=0 REDLINE_COLLISION_STRICT=1 python test_gateway_hardening.py
EXPOSE 8787
CMD ["python3","server.py"]
