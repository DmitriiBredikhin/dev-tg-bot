build:
	docker build -t tgbotgpt .
run:
	docker run -d -p 3000:3000 --name tgbotgpt --rm tgbotgpt