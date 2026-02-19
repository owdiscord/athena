APP=athena_api
CMD=./cmd/$(APP)

.PHONY: run build clean

run:
	go run $(CMD)

build:
	go build -o bin/$(APP) $(CMD)

watch:
	watchexec -r -e go -- go run $(CMD)

clean:
	rm -rf bin/
