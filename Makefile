build:
	docker build -t tgbotGPT .
run:
	docker run -d -p 3000:3000 --name tgbotGPT --rm tgbotGPT